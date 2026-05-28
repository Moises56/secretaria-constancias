import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// CSP segmentada por contexto. Relajaciones documentadas en CLAUDE.md
// ("Convenciones FASE 10 — Seguridad"):
//  - script-src 'unsafe-inline': Next inyecta scripts inline de hidratación
//    (sin nonce/strict-dynamic en v1).
//  - 'unsafe-eval' SOLO en dev: Turbopack HMR lo necesita; prod no lo incluye.
//  - style-src 'unsafe-inline': Tailwind + next-themes + estilos inline de
//    recharts/GSAP. Estándar en apps Next con CSS-in-JS.
//  - img-src data:/blob:: QR como data URL.
const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"])],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'", "data:"],
  // En dev, Turbopack HMR usa websocket al mismo origen.
  "connect-src": ["'self'", ...(isProd ? [] : ["ws:", "wss:"])],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "upgrade-insecure-requests": [],
};

const cspHeader = Object.entries(cspDirectives)
  .map(([key, values]) => (values.length ? `${key} ${values.join(" ")}` : key))
  .join("; ");

// Headers base (sin CSP) — aplican a TODO, incluidas las API routes.
const baseSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/(.*)", headers: baseSecurityHeaders },
      // La CSP de la app NO se aplica a /api/* — un header CSP de config
      // sobreescribe el del route handler, y el PDF necesita su propia CSP
      // aislada (`default-src 'none'`). Las API routes (CSV/PDF) no son
      // documentos HTML, así que no requieren la CSP de página.
      {
        source: "/((?!api/).*)",
        headers: [{ key: "Content-Security-Policy", value: cspHeader }],
      },
    ];
  },
};

export default nextConfig;
