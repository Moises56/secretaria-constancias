import "server-only";

import { verify as argon2Verify } from "@node-rs/argon2";
import { type Role } from "@prisma/client";
import { CredentialsSignin, type NextAuthConfig, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { isSecurityStampValid } from "@/server/auth/security-stamp";
import { prisma } from "@/server/db";
import { recordLogin, recordLoginBlocked, recordLoginFailed } from "@/server/lib/audit";
import { getClientIpFromHeaders } from "@/server/lib/get-client-ip";
import { loginRateLimiter } from "@/server/lib/rate-limit";

const credentialsSchema = z.object({
  identifier: z.string().trim().min(3).max(100),
  password: z.string().min(8).max(200),
});

/**
 * Lanzamos el mismo error genérico para todos los modos de falla (no user,
 * inactivo, bad password, rate-limited). NO revelamos cuál fue para no
 * filtrar la existencia de usuarios.
 */
class InvalidCredentialsError extends CredentialsSignin {
  override code = "invalid_credentials";
}

function extractClientInfo(request: Request) {
  const ipAddress = getClientIpFromHeaders(request.headers);
  const userAgent = request.headers.get("user-agent") ?? null;
  return { ipAddress, userAgent };
}

// El prefijo `__Secure-` y el flag `secure:` se derivan del esquema de
// AUTH_URL — NO de NODE_ENV. Next.js hardcodea `process.env.NODE_ENV =
// "production"` en el bundle durante `next build` (ver
// node_modules/next/dist/build/define-env.js), así que `isProd` por
// NODE_ENV es siempre true en builds, incluido el de CI sobre HTTP, lo
// que hace que el browser rechace la cookie `__Secure-` y rompa el login.
// AUTH_URL refleja el esquema REAL del cliente (HTTPS detrás del reverse
// proxy de AMDC; HTTP local/CI).
const isHttps = (process.env.AUTH_URL ?? "").startsWith("https://");

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  cookies: {
    sessionToken: {
      name: isHttps ? "__Secure-auth.session-token" : "auth.session-token",
      options: {
        httpOnly: true,
        secure: isHttps,
        sameSite: "lax",
        path: "/",
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        identifier: {},
        password: {},
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          throw new InvalidCredentialsError();
        }

        const { identifier, password } = parsed.data;
        const { ipAddress, userAgent } = extractClientInfo(request);

        // Rate limit por IP — 5 intentos / 15 min. Si está bloqueada,
        // registramos y rechazamos sin tocar la BD del usuario.
        const rlKey = `login:${ipAddress ?? "unknown"}`;
        const rl = await loginRateLimiter.check(rlKey);
        if (!rl.allowed) {
          await recordLoginBlocked({ identifier, ipAddress, userAgent });
          throw new InvalidCredentialsError();
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: identifier, mode: "insensitive" } },
              { email: { equals: identifier, mode: "insensitive" } },
            ],
          },
        });

        if (!user) {
          await recordLoginFailed({ identifier, reason: "no_user", ipAddress, userAgent });
          throw new InvalidCredentialsError();
        }

        if (!user.isActive) {
          await recordLoginFailed({ identifier, reason: "inactive", ipAddress, userAgent });
          throw new InvalidCredentialsError();
        }

        const passwordOk = await argon2Verify(user.passwordHash, password);
        if (!passwordOk) {
          await recordLoginFailed({ identifier, reason: "bad_password", ipAddress, userAgent });
          throw new InvalidCredentialsError();
        }

        // Login válido: reseteamos el rate limiter de esta IP, marcamos
        // lastLoginAt y dejamos AuditLog.
        await loginRateLimiter.reset(rlKey);
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await recordLogin({ userId: user.id, ipAddress, userAgent });

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          securityStamp: user.securityStamp.toISOString(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Tras login válido copiamos el snapshot completo al JWT.
        token.id = user.id;
        token.username = user.username;
        token.email = user.email;
        token.fullName = user.fullName;
        token.role = user.role as Role;
        token.securityStamp = user.securityStamp;
      }
      return token;
    },
    async session({ session, token }) {
      // El parámetro `session` está sobre-tipado en Auth.js v5 (intersección
      // de DB + JWT modes). Devolvemos un objeto nuevo casteado a Session.
      const expiredSession: Session = {
        ...session,
        user: undefined as never,
        expires: new Date(0).toISOString(),
      };

      if (!token?.id || !token.securityStamp) {
        return expiredSession;
      }

      const valid = await isSecurityStampValid(token.id, token.securityStamp);
      if (!valid) {
        return expiredSession;
      }

      const nextSession: Session = {
        ...session,
        expires: session.expires,
        user: {
          id: token.id,
          username: token.username,
          email: token.email,
          fullName: token.fullName,
          role: token.role,
        },
      };
      return nextSession;
    },
  },
};
