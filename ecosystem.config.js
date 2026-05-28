// ecosystem.config.js — PM2 config para Constancias AMDC (FASE 12)
//
// Decisiones bloqueadas:
//  - fork mode + instances:1 (NO cluster). El rate-limit es in-memory
//    (login 5/15min, verify 30/min, export 10/min). Cluster daría a cada
//    worker su propio Map → el límite global se rompería. Si en el
//    futuro se migra rate-limit a Redis (hay `siclopr_redis` en el
//    servidor) se puede subir instances.
//  - max_memory_restart: 768M (recharts + @react-pdf son pesados).
//  - script: node_modules/.bin/next + args: "start -p 3010" — más
//    portable que un path absoluto a node y respeta la versión del
//    binario que la app tiene en sus dependencias.
//  - El parser de .env.production replica el patrón usado en otras apps
//    AMDC (Despacho). Permite valores con/sin comillas. NO usa dotenv
//    para no requerir esa dependencia en runtime de PM2.

const { readFileSync } = require("fs");
const { resolve } = require("path");

function loadEnvFile(filePath) {
  const env = {};
  try {
    const content = readFileSync(resolve(__dirname, filePath), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch (err) {
    console.error("[ecosystem] Error cargando .env.production:", err.message);
  }
  return env;
}

const prodEnv = loadEnvFile(".env.production");

module.exports = {
  apps: [
    {
      name: "secretaria-constancias-3010",
      script: "node_modules/.bin/next",
      args: "start -p 3010",
      cwd: "/home/amdcadmin/AmdcFactProyect/Constancias",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "768M",
      env: {
        ...prodEnv,
        NODE_ENV: "production",
        PORT: 3010,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
