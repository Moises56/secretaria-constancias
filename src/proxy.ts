import { NextResponse } from "next/server";

import { auth } from "@/server/auth";

// Rutas que NO requieren autenticación. Cualquier otra ruta exige sesión
// válida. NOTA: el matcher en `config` ya excluye `/api/auth/*` y archivos
// estáticos; aquí solo listamos las páginas públicas del usuario.
const PUBLIC_PATHS = ["/login", "/v"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = Boolean(req.auth?.user?.id);

  // Sin sesión en ruta privada → redirige a login conservando callbackUrl.
  if (!isAuthed && !isPublic(pathname)) {
    const url = new URL("/login", req.nextUrl.origin);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesión y yendo a /login → fuera del login, al dashboard.
  if (isAuthed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // /admin/* solo ADMIN.
  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  // Excluye /api/auth/* (lo maneja next-auth) y /api/health (lo consulta
  // el proxy AMDC + PM2 sin sesión — FASE 12), además de los estáticos.
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
