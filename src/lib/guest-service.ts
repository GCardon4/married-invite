import { randomBytes } from "node:crypto";

import type { z } from "zod";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { getGuestRepository, type GuestRepository } from "@/lib/guest-repository";
import { computeStatistics } from "@/lib/statistics";
import { generateToken, hashToken } from "@/lib/token";
import {
  createGuestInputSchema,
  guestIdSchema,
  guestListQuerySchema,
  guestResponseSchema,
  publicTokenSchema,
  updateGuestInputSchema,
} from "@/lib/validations";
import type { AdminGuest, Guest, GuestStatistics, PublicInvitation } from "@/types/guest";

export interface GuestListResult {
  items: AdminGuest[];
  total: number;
  page: number;
  limit: number;
}

/** El token en texto plano solo existe en este valor de retorno: no se persiste. */
export interface GuestWithToken {
  guest: AdminGuest;
  token: string;
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(
      undefined,
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

function parseGuestId(id: unknown): string {
  return parseInput(guestIdSchema, id);
}

/** Quita `tokenHash`: ninguna salida del servicio lo expone. */
function toAdminGuest(guest: Guest): AdminGuest {
  const { tokenHash: _tokenHash, ...rest } = guest;
  void _tokenHash;
  return rest;
}

function toPublicInvitation(guest: Guest): PublicInvitation {
  return {
    name: guest.name,
    allowedGuests: guest.allowedGuests,
    confirmedGuests: guest.confirmedGuests,
    status: guest.status,
  };
}

function generateGuestId(): string {
  return `guest_${randomBytes(16).toString("hex")}`;
}

/**
 * Reglas de negocio. No toca el sistema de archivos: toda persistencia pasa por
 * el repositorio, y las reglas que dependen del registro almacenado (cupo) se
 * verifican dentro de `repository.update`, de forma indivisible con la escritura.
 */
export class GuestService {
  constructor(
    private readonly repository: GuestRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // --- Administración -------------------------------------------------------

  async createGuest(input: unknown): Promise<GuestWithToken> {
    const data = parseInput(createGuestInputSchema, input);
    const token = generateToken();
    const timestamp = this.timestamp();

    const guest = await this.repository.create({
      id: generateGuestId(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      allowedGuests: data.allowedGuests,
      confirmedGuests: 0,
      status: "pending",
      tokenHash: hashToken(token),
      createdAt: timestamp,
      updatedAt: timestamp,
      respondedAt: null,
    });

    return { guest: toAdminGuest(guest), token };
  }

  async listGuests(query: unknown = {}): Promise<GuestListResult> {
    const { search, status, page, limit } = parseInput(guestListQuerySchema, query);
    const needle = search?.toLocaleLowerCase();

    const matches = (await this.repository.list()).filter((guest) => {
      if (status && guest.status !== status) return false;
      if (!needle) return true;
      return [guest.name, guest.email, guest.phone].some((field) =>
        field?.toLocaleLowerCase().includes(needle),
      );
    });

    const start = (page - 1) * limit;
    return {
      items: matches.slice(start, start + limit).map(toAdminGuest),
      total: matches.length,
      page,
      limit,
    };
  }

  /** Todas las invitaciones (sin paginar y sin hashes de token), para exportar desde el panel. */
  async listAllGuests(): Promise<AdminGuest[]> {
    return (await this.repository.list()).map(toAdminGuest);
  }

  async getStatistics(): Promise<GuestStatistics> {
    return computeStatistics(await this.repository.list());
  }

  async getGuest(id: unknown): Promise<AdminGuest> {
    const guest = await this.repository.find({ id: parseGuestId(id) });
    if (!guest) throw new NotFoundError();
    return toAdminGuest(guest);
  }

  async updateGuest(id: unknown, input: unknown): Promise<AdminGuest> {
    const guestId = parseGuestId(id);
    const data = parseInput(updateGuestInputSchema, input);

    const updated = await this.repository.update({ id: guestId }, (current) => {
      if (data.allowedGuests !== undefined && data.allowedGuests < current.confirmedGuests) {
        throw new ConflictError(
          "El cupo no puede ser menor que los asistentes ya confirmados.",
        );
      }
      return { ...current, ...data, updatedAt: this.timestamp() };
    });
    return toAdminGuest(updated);
  }

  async deleteGuest(id: unknown): Promise<void> {
    await this.repository.delete(parseGuestId(id));
  }

  /** Invalida el enlace anterior de inmediato y devuelve el nuevo una sola vez. */
  async regenerateToken(id: unknown): Promise<GuestWithToken> {
    const guestId = parseGuestId(id);
    const token = generateToken();
    const tokenHash = hashToken(token);

    const updated = await this.repository.update({ id: guestId }, (current) => ({
      ...current,
      tokenHash,
      updatedAt: this.timestamp(),
    }));
    return { guest: toAdminGuest(updated), token };
  }

  // --- Invitado (acceso por token) ------------------------------------------

  async getPublicInvitation(token: unknown): Promise<PublicInvitation> {
    const guest = await this.repository.find({ tokenHash: this.hashPublicToken(token) });
    if (!guest) throw new NotFoundError();
    return toPublicInvitation(guest);
  }

  async submitResponse(token: unknown, input: unknown): Promise<PublicInvitation> {
    // Primero el token: un enlace inválido nunca revela si el cuerpo era correcto.
    const tokenHash = this.hashPublicToken(token);
    const response = parseInput(guestResponseSchema, input);

    const updated = await this.repository.update({ tokenHash }, (current) => {
      // El cupo sale del registro almacenado, nunca de lo enviado por el navegador.
      if (response.confirmedGuests > current.allowedGuests) {
        throw new ValidationError(
          `Tu invitación admite hasta ${current.allowedGuests} ${current.allowedGuests === 1 ? "persona" : "personas"}.`,
          [
            { path: "confirmedGuests", message: "Supera el cupo autorizado." },
          ],
        );
      }
      const timestamp = this.timestamp();
      return {
        ...current,
        status: response.status,
        confirmedGuests: response.confirmedGuests,
        respondedAt: timestamp,
        updatedAt: timestamp,
      };
    });
    return toPublicInvitation(updated);
  }

  // --- Internos -------------------------------------------------------------

  /** Un token mal formado y uno inexistente producen el mismo error (404). */
  private hashPublicToken(token: unknown): string {
    const parsed = publicTokenSchema.safeParse(token);
    if (!parsed.success) throw new NotFoundError();
    return hashToken(parsed.data);
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

export function getGuestService(): GuestService {
  return new GuestService(getGuestRepository());
}
