import "server-only";

import QRCode from "qrcode";

import { env } from "@/env";

/** Quita slash final de APP_URL si existe (evita "//v/..."). */
function verifyUrl(token: string): string {
  return `${env.APP_URL.replace(/\/+$/, "")}/v/${token}`;
}

const COMMON_OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 1,
  width: 220,
  color: { dark: "#000000", light: "#FFFFFF" },
} as const;

/** PNG codificado como data URL (`data:image/png;base64,...`). */
export async function generateQrDataUrl(verificationToken: string): Promise<string> {
  return QRCode.toDataURL(verifyUrl(verificationToken), COMMON_OPTIONS);
}

/** PNG como Buffer crudo — preferido para embebido en @react-pdf. */
export async function generateQrBuffer(verificationToken: string): Promise<Buffer> {
  return QRCode.toBuffer(verifyUrl(verificationToken), COMMON_OPTIONS);
}

/** Sólo expuesto para pruebas — construye la URL pública que el QR contendrá. */
export function buildVerificationUrl(verificationToken: string): string {
  return verifyUrl(verificationToken);
}
