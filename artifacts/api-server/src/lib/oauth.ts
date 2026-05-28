import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db, usersTable, userIdentitiesTable } from "@workspace/db";

export type Provider = "google" | "facebook" | "github";

export type ProviderProfile = {
  providerUserId: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  raw?: unknown;
};

export type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  userinfoUrl: string;
  extractProfile: (userinfo: any, token: any) => Promise<ProviderProfile>;
  extraAuthParams?: Record<string, string>;
};

export function baseUrl(): string {
  return process.env["PUBLIC_BASE_URL"] || "https://baingers.com";
}

export function callbackUrl(provider: Provider): string {
  return `${baseUrl()}/api/auth/${provider}/callback`;
}

export const PROVIDERS: Record<Provider, () => OAuthConfig | null> = {
  google: () => {
    const id = process.env["GOOGLE_CLIENT_ID"];
    const secret = process.env["GOOGLE_CLIENT_SECRET"];
    if (!id || !secret) return null;
    return {
      clientId: id,
      clientSecret: secret,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      userinfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
      extraAuthParams: { access_type: "online", prompt: "select_account" },
      extractProfile: async (u) => ({
        providerUserId: String(u.sub),
        email: u.email ?? null,
        name: u.name || u.email?.split("@")[0] || "Google user",
        avatarUrl: u.picture ?? null,
        raw: u,
      }),
    };
  },
  facebook: () => {
    const id = process.env["FACEBOOK_CLIENT_ID"];
    const secret = process.env["FACEBOOK_CLIENT_SECRET"];
    if (!id || !secret) return null;
    return {
      clientId: id,
      clientSecret: secret,
      authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
      scope: "email public_profile",
      userinfoUrl: "https://graph.facebook.com/me?fields=id,name,email,picture.width(256).height(256)",
      extractProfile: async (u) => ({
        providerUserId: String(u.id),
        email: u.email ?? null,
        name: u.name || u.email?.split("@")[0] || "Facebook user",
        avatarUrl: u.picture?.data?.url ?? null,
        raw: u,
      }),
    };
  },
  github: () => {
    const id = process.env["GITHUB_CLIENT_ID"];
    const secret = process.env["GITHUB_CLIENT_SECRET"];
    if (!id || !secret) return null;
    return {
      clientId: id,
      clientSecret: secret,
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email",
      userinfoUrl: "https://api.github.com/user",
      extractProfile: async (u, token) => {
        let email: string | null = u.email ?? null;
        if (!email && token?.access_token) {
          const r = await fetch("https://api.github.com/user/emails", {
            headers: {
              Authorization: `Bearer ${token.access_token}`,
              "User-Agent": "baingers-app",
              Accept: "application/vnd.github+json",
            },
          });
          if (r.ok) {
            const emails = (await r.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
            const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
            email = primary?.email ?? null;
          }
        }
        return {
          providerUserId: String(u.id),
          email,
          name: u.name || u.login || "GitHub user",
          avatarUrl: u.avatar_url ?? null,
          raw: u,
        };
      },
    };
  },
};

const stateStore = new Map<string, { provider: Provider; createdAt: number; returnTo: string }>();
const STATE_TTL_MS = 10 * 60 * 1000;

export function issueState(provider: Provider, returnTo: string): string {
  const state = crypto.randomBytes(24).toString("hex");
  stateStore.set(state, { provider, createdAt: Date.now(), returnTo });
  for (const [k, v] of stateStore) if (Date.now() - v.createdAt > STATE_TTL_MS) stateStore.delete(k);
  return state;
}

export function consumeState(state: string): { provider: Provider; returnTo: string } | null {
  const item = stateStore.get(state);
  if (!item) return null;
  stateStore.delete(state);
  if (Date.now() - item.createdAt > STATE_TTL_MS) return null;
  return { provider: item.provider, returnTo: item.returnTo };
}

export function buildAuthorizeUrl(provider: Provider, state: string): string | null {
  const cfg = PROVIDERS[provider]();
  if (!cfg) return null;
  const u = new URL(cfg.authorizeUrl);
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", callbackUrl(provider));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", cfg.scope);
  u.searchParams.set("state", state);
  for (const [k, v] of Object.entries(cfg.extraAuthParams ?? {})) u.searchParams.set(k, v);
  return u.toString();
}

export async function exchangeCode(provider: Provider, code: string): Promise<any> {
  const cfg = PROVIDERS[provider]();
  if (!cfg) throw new Error(`Provider ${provider} not configured`);
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: callbackUrl(provider),
    grant_type: "authorization_code",
  });
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed for ${provider}: ${res.status} ${text}`);
  }
  return res.json();
}

export async function fetchProfile(
  provider: Provider,
  token: { access_token?: string },
): Promise<ProviderProfile> {
  const cfg = PROVIDERS[provider]();
  if (!cfg) throw new Error(`Provider ${provider} not configured`);
  const res = await fetch(cfg.userinfoUrl, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": "baingers-app",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Userinfo fetch failed for ${provider}: ${res.status} ${text}`);
  }
  const userinfo = await res.json();
  return cfg.extractProfile(userinfo, token);
}

export async function findOrLinkUser(
  provider: Provider,
  profile: ProviderProfile,
): Promise<{ userId: number; created: boolean }> {
  const existingIdentity = await db
    .select()
    .from(userIdentitiesTable)
    .where(
      and(
        eq(userIdentitiesTable.provider, provider),
        eq(userIdentitiesTable.providerUserId, profile.providerUserId),
      ),
    )
    .limit(1);

  if (existingIdentity[0]) {
    await db
      .update(userIdentitiesTable)
      .set({ lastSignInAt: new Date(), providerEmail: profile.email })
      .where(eq(userIdentitiesTable.id, existingIdentity[0].id));
    return { userId: existingIdentity[0].userId, created: false };
  }

  let userId: number | undefined;
  if (profile.email) {
    const byEmail = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, profile.email.toLowerCase()))
      .limit(1);
    if (byEmail[0]) userId = byEmail[0].id;
  }

  let created = false;
  if (!userId) {
    const inserted = await db
      .insert(usersTable)
      .values({
        email: (profile.email ?? `${provider}-${profile.providerUserId}@baingers.local`).toLowerCase(),
        name: profile.name,
        role: "member",
        passwordHash: null,
        isActive: true,
        forcePasswordChange: false,
        avatarUrl: profile.avatarUrl,
      })
      .returning();
    userId = inserted[0]!.id;
    created = true;
  } else if (profile.avatarUrl) {
    const current = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!current[0]?.avatarUrl) {
      await db
        .update(usersTable)
        .set({ avatarUrl: profile.avatarUrl })
        .where(eq(usersTable.id, userId));
    }
  }

  await db.insert(userIdentitiesTable).values({
    userId,
    provider,
    providerUserId: profile.providerUserId,
    providerEmail: profile.email,
    providerData: profile.raw ? JSON.stringify(profile.raw).slice(0, 8000) : null,
  });

  return { userId, created };
}

export function configuredProviders(): Provider[] {
  return (Object.keys(PROVIDERS) as Provider[]).filter((p) => PROVIDERS[p]() !== null);
}
