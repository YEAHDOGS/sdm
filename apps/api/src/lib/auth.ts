import type { Context } from "hono";
import type { Env } from "../env";

export interface Session {
  userId: string;
  roles: string[];
}

/**
 * AUTH SEAM — dev stub.
 *
 * Production: phone/email OTP flow mints a JWT signed with SESSION_JWT_SECRET;
 * this function verifies it (WebCrypto HMAC) and loads roles from D1.
 *
 * Dev: `Authorization: Bearer dev:<userId>` resolves to that user. Only honored
 * when ENVIRONMENT === "dev".
 */
export async function getSession(
  c: Context<{ Bindings: Env }>
): Promise<Session | null> {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);

  if (c.env.ENVIRONMENT === "dev" && token.startsWith("dev:")) {
    const userId = token.slice("dev:".length);
    const row = await c.env.DB.prepare("SELECT id, roles FROM users WHERE id = ?")
      .bind(userId)
      .first<{ id: string; roles: string }>();
    if (!row) return null;
    return { userId: row.id, roles: row.roles.split(",") };
  }

  // TODO(auth): verify HMAC-signed session JWT here.
  return null;
}

export async function requireSession(c: Context<{ Bindings: Env }>): Promise<Session> {
  const session = await getSession(c);
  if (!session) {
    throw Object.assign(new Error("unauthorized"), { status: 401 });
  }
  return session;
}

export function requireRole(session: Session, role: string): void {
  if (!session.roles.includes(role)) {
    throw Object.assign(new Error(`requires role ${role}`), { status: 403 });
  }
}
