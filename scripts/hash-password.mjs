// Genera el valor de ADMIN_PASSWORD_HASH (Argon2id). Uso: npm run hash-password
// La contraseña se pide sin eco y nunca se pasa como argumento (quedaría en el historial del shell).
import { hash } from "@node-rs/argon2";

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      // Entrada por tubería (p. ej. en automatizaciones): una línea.
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => (data += chunk));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0]));
      stdin.on("error", reject);
      return;
    }

    stdout.write(prompt);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (char) => {
      for (const c of char) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(130); // Ctrl+C
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

const MIN_LENGTH = 12;

const password = await readHidden("Contraseña del administrador: ");
if (process.stdin.isTTY) {
  const again = await readHidden("Repite la contraseña: ");
  if (again !== password) {
    console.error("Las contraseñas no coinciden.");
    process.exit(1);
  }
}
if (password.length < MIN_LENGTH) {
  console.error(`Usa al menos ${MIN_LENGTH} caracteres.`);
  process.exit(1);
}

const phc = await hash(password); // Argon2id con los parámetros recomendados por defecto
const encoded = `base64:${Buffer.from(phc, "utf8").toString("base64")}`;

console.log("\nCopia esta línea en .env o en las variables de entorno de Coolify:\n");
console.log(`ADMIN_PASSWORD_HASH=${encoded}\n`);
console.log("(Va codificado en base64 porque el hash contiene «$», que los archivos .env interpretan como variable.)");
