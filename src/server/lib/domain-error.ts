import "server-only";

/**
 * Error de regla de negocio cuyo `message` ES seguro mostrar al usuario final
 * (a diferencia de errores genéricos de infraestructura, que se enmascaran).
 *
 * Las Server Actions distinguen: `err instanceof DomainError` → devolver
 * `err.message`; cualquier otro error → mensaje genérico + `logger.error`.
 *
 * Úsalo para: último administrador, auto-desactivación, tipo de constancia
 * que quedaría sin firmante activo, y otras invariantes con mensaje accionable.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
