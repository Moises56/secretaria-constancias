import { redirect } from "next/navigation";

// Sin esta página el RSC prefetch a `/admin?_rsc=...` (que Next 16 dispara al
// hover de cualquier Link a /admin/<sub>) devuelve 404 y ensucia logs.
// Redirige al primer ítem del menú Admin que cualquier ADMIN puede ver.
export default function AdminIndex() {
  redirect("/admin/firmantes");
}
