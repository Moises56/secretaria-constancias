import { type Role } from "@prisma/client";

/**
 * Lógica pura de invariantes de seguridad de FASE 9. Sin acceso a BD: las
 * Server Actions consultan los conteos y delegan la decisión aquí, de modo que
 * la regla quede unit-testeable sin levantar Postgres.
 */

/**
 * Tipos de constancia que el firmante DEJARÁ de cubrir activamente con el
 * cambio propuesto. Son los únicos que requieren verificar que exista OTRO
 * firmante activo asignado (invariante: cada tipo ≥1 firmante activo).
 *
 * - Si el firmante ya estaba inactivo, no cubría nada → ningún tipo en riesgo.
 * - Si se desactiva, pierde TODOS sus tipos actuales.
 * - Si sigue activo, pierde solo los tipos removidos de `nextTypes`.
 * - Agregar tipos o reactivar NUNCA pone tipos en riesgo.
 */
export function typesLosingActiveSigner<T extends string>(args: {
  wasActive: boolean;
  currentTypes: readonly T[];
  willBeActive: boolean;
  nextTypes: readonly T[];
}): T[] {
  if (!args.wasActive) return [];
  const coversAfter = new Set<T>(args.willBeActive ? args.nextTypes : []);
  return [...new Set(args.currentTypes)].filter((t) => !coversAfter.has(t));
}

/**
 * True si la operación dejaría al sistema sin ningún ADMIN activo. Aplica tanto
 * a desactivar un ADMIN activo como a degradar su rol a SECRETARY/VIEWER.
 */
export function wouldRemoveLastAdmin(args: {
  beforeRole: Role;
  beforeActive: boolean;
  afterRole: Role;
  afterActive: boolean;
  /** Cantidad de OTROS administradores activos (id != target). */
  otherActiveAdmins: number;
}): boolean {
  const wasActiveAdmin = args.beforeActive && args.beforeRole === "ADMIN";
  const willBeActiveAdmin = args.afterActive && args.afterRole === "ADMIN";
  return wasActiveAdmin && !willBeActiveAdmin && args.otherActiveAdmins === 0;
}
