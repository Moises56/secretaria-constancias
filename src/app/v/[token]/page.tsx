import { headers } from "next/headers";

import { NotFoundCard } from "@/components/verification/NotFoundCard";
import { RateLimitedCard } from "@/components/verification/RateLimitedCard";
import { VerificationCard } from "@/components/verification/VerificationCard";
import { prisma } from "@/server/db";
import { recordConstanciaVerified } from "@/server/lib/audit";
import { getClientIpFromHeaders } from "@/server/lib/get-client-ip";
import { checkVerifyRateLimit } from "@/server/lib/rate-limit";

import type { Metadata } from "next";

// Siempre fresca: el resultado depende del registro vivo en BD.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Verificación de constancia",
  description:
    "Página oficial de verificación de constancias emitidas por la Secretaría Municipal del Distrito Central.",
  robots: { index: false, follow: false, nocache: true },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

function extractClientInfo(h: Headers) {
  const ipAddress = getClientIpFromHeaders(h);
  const userAgent = h.get("user-agent") ?? "unknown";
  return { ipAddress, userAgent };
}

export default async function VerifyPage({ params }: PageProps) {
  const { token } = await params;
  const h = await headers();
  const { ipAddress, userAgent } = extractClientInfo(h);
  const tokenPrefix = token.slice(0, 8);

  // 1) Rate limit primero — no tocamos BD si la IP está bloqueada.
  const rateLimit = await checkVerifyRateLimit(ipAddress);
  if (rateLimit.blocked) {
    await recordConstanciaVerified({
      ipAddress,
      userAgent,
      tokenPrefix,
      result: "RATE_LIMITED",
    });
    return <RateLimitedCard retryAfterMs={rateLimit.retryAfterMs} />;
  }

  // 2) Búsqueda por token. Select restrictivo: solo los campos que la página
  //    pública necesita (NO traemos el verificationToken, ni issuedById, etc).
  const constancia = await prisma.constancia.findUnique({
    where: { verificationToken: token },
    select: {
      id: true,
      folioNumber: true,
      folioYear: true,
      type: true,
      status: true,
      applicantFullName: true,
      applicantIdNumber: true,
      signerName: true,
      signerTitleLine: true,
      issuedAt: true,
      annulledAt: true,
      annulledReason: true,
    },
  });

  if (!constancia) {
    await recordConstanciaVerified({
      ipAddress,
      userAgent,
      tokenPrefix,
      result: "NOT_FOUND",
    });
    return <NotFoundCard />;
  }

  await recordConstanciaVerified({
    ipAddress,
    userAgent,
    tokenPrefix,
    result: constancia.status === "ACTIVE" ? "FOUND_ACTIVE" : "FOUND_ANNULLED",
    constanciaId: constancia.id,
  });

  return <VerificationCard constancia={constancia} />;
}
