// @react-pdf/renderer usa dependencias nativas de Node — no funciona en Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { generateConstanciaPdf } from "@/server/services/pdf.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const c = await prisma.constancia.findUnique({ where: { id } });
  if (!c) return new Response("Not Found", { status: 404 });

  const pdf = await generateConstanciaPdf(c);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="constancia-${c.folio}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Length": String(pdf.length),
      "X-Content-Type-Options": "nosniff",
      // PDF servido aislado: nada de scripts/recursos externos desde el visor.
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
