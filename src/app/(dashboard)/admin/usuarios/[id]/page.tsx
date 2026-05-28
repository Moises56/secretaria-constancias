import { redirect } from "next/navigation";

// El menú de fila linkea a `/admin/usuarios/<id>/editar`. Mismo motivo que en
// `/admin/firmantes/<id>/page.tsx`: el prefetch RSC del parent segment
// retorna 404 sin esta página. Redirige al detalle real (editar).
interface Props {
  params: Promise<{ id: string }>;
}

export default async function UsuarioIndex({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/usuarios/${id}/editar`);
}
