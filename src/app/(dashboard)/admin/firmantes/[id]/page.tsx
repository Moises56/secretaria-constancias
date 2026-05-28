import { redirect } from "next/navigation";

// El menú de fila linkea a `/admin/firmantes/<id>/editar`. Next 16 prefetcha
// también el parent segment `/admin/firmantes/<id>` y, sin page.tsx aquí,
// devuelve 404 → ruido en console y trabajo extra del middleware.
// Redirige al detalle real (editar).
interface Props {
  params: Promise<{ id: string }>;
}

export default async function FirmanteIndex({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/firmantes/${id}/editar`);
}
