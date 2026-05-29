import Link from "next/link";
import { notFound } from "next/navigation";

import { type ConstanciaType } from "@prisma/client";
import { Download, Printer, ShieldAlert } from "lucide-react";

import { AnulModal } from "@/components/forms/AnulModal";
import { NewConstanciaHighlight } from "@/components/forms/NewConstanciaHighlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TYPE_LABEL } from "@/lib/constancia-template";
import { displayFolio, formatDateTimeHN } from "@/lib/utils/format";
import { can } from "@/server/auth/permissions";
import { requireAuth } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { generateQrDataUrl } from "@/server/services/qr.service";

const TYPE_BADGE: Record<ConstanciaType, "default" | "secondary" | "destructive"> = {
  CVD: "secondary",
  CVP: "default",
  CVE: "destructive",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConstanciaDetailPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id } = await params;

  const constancia = await prisma.constancia.findUnique({
    where: { id },
    include: {
      issuedBy: { select: { fullName: true, username: true } },
      annulledBy: { select: { fullName: true, username: true } },
    },
  });
  if (!constancia) notFound();

  const qrDataUrl = await generateQrDataUrl(constancia.verificationToken);
  const isAnnulled = constancia.status === "ANNULLED";
  const canAnnul = !isAnnulled && can(session.user.role, "CONSTANCIA_ANNUL");

  const pdfUrl = `/api/constancias/${constancia.id}/pdf`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Cliente sin DOM: anima el folio si la URL trae ?new=1 */}
      <NewConstanciaHighlight />

      {isAnnulled && (
        <div
          className="border-destructive/30 bg-destructive/10 text-destructive flex flex-col gap-2 rounded-lg border p-4"
          role="alert"
          data-testid="annul-banner"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5" aria-hidden />
            <strong className="text-sm font-semibold tracking-wide uppercase">
              Constancia anulada
            </strong>
          </div>
          {constancia.annulledReason && <p className="text-sm">{constancia.annulledReason}</p>}
          {constancia.annulledAt && (
            <p className="text-xs opacity-80">
              Anulada el {formatDateTimeHN(constancia.annulledAt)}
              {constancia.annulledBy && ` por ${constancia.annulledBy.fullName}`}.
            </p>
          )}
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
            Constancia · {TYPE_LABEL[constancia.type]}
          </p>
          <h1
            className="text-foreground font-mono text-3xl leading-tight font-semibold tracking-wide sm:text-4xl"
            data-testid="constancia-folio"
            data-folio
          >
            {displayFolio(constancia)}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={TYPE_BADGE[constancia.type]}>{constancia.type}</Badge>
            <Badge variant={isAnnulled ? "destructive" : "secondary"} data-testid="status-badge">
              {isAnnulled ? "ANULADA" : "ACTIVA"}
            </Badge>
            {constancia.paperSerial && (
              <span className="text-muted-foreground font-mono text-xs">
                Papel: {constancia.paperSerial}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" data-testid="open-pdf" />
            }
          >
            <Printer className="size-4" aria-hidden />
            Imprimir
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={
              <a
                href={pdfUrl}
                download={`constancia-${constancia.folio}.pdf`}
                data-testid="download-pdf"
              />
            }
          >
            <Download className="size-4" aria-hidden />
            Descargar PDF
          </Button>
          {canAnnul && <AnulModal constanciaId={constancia.id} folio={constancia.folio} />}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Solicitante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Nombre:</span>{" "}
                <strong className="font-medium">
                  {constancia.applicantFullName.toUpperCase()}
                </strong>
              </p>
              <p>
                <span className="text-muted-foreground">Identidad:</span>{" "}
                <span className="font-mono">{constancia.applicantIdNumber}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Firmante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{constancia.signerName}</p>
              <p className="text-muted-foreground italic">{constancia.signerTitleLine}</p>
              <p className="text-muted-foreground text-xs">
                Snapshot inmutable al momento de emisión. Cambios futuros al firmante NO afectan
                esta constancia.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Auditoría</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Emitido el</span>{" "}
                {formatDateTimeHN(constancia.issuedAt)}{" "}
                <span className="text-muted-foreground">por</span>{" "}
                <strong className="font-medium">{constancia.issuedBy.fullName}</strong>
              </p>
              {isAnnulled && constancia.annulledAt && (
                <p>
                  <span className="text-muted-foreground">Anulada el</span>{" "}
                  {formatDateTimeHN(constancia.annulledAt)}
                  {constancia.annulledBy && (
                    <>
                      {" "}
                      <span className="text-muted-foreground">por</span>{" "}
                      <strong className="font-medium">{constancia.annulledBy.fullName}</strong>
                    </>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Verificación pública</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR de verificación"
                width={200}
                height={200}
                className="rounded-md border"
              />
              <p className="text-muted-foreground text-center text-xs">
                Escanéalo para verificar la autenticidad del documento.
              </p>
              <Link
                href={`/v/${constancia.verificationToken}`}
                target="_blank"
                className="text-primary font-mono text-[0.7rem] break-all hover:underline"
              >
                /v/{constancia.verificationToken.slice(0, 16)}…
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
