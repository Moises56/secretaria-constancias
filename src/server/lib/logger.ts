import "server-only";

import { pino } from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  // Pretty print en dev; JSON estructurado en prod (lo captura el orquestador).
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      },
  redact: {
    paths: ["password", "passwordHash", "*.password", "*.passwordHash", "token", "*.token"],
    censor: "[REDACTED]",
  },
});
