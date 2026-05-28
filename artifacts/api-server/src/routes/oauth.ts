import { Router, type IRouter } from "express";
import { createSession } from "../storage/sessions.js";
import {
  configuredProviders,
  buildAuthorizeUrl,
  issueState,
  consumeState,
  exchangeCode,
  fetchProfile,
  findOrLinkUser,
  baseUrl,
  type Provider,
} from "../lib/oauth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/auth/providers", (_req, res) => {
  res.json({ providers: configuredProviders() });
});

const SUPPORTED: Provider[] = ["google", "facebook", "github"];

router.get("/auth/:provider/start", (req, res) => {
  const provider = req.params.provider as Provider;
  if (!SUPPORTED.includes(provider)) {
    res.status(400).send("Unknown provider");
    return;
  }
  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : "/";
  const state = issueState(provider, returnTo);
  const url = buildAuthorizeUrl(provider, state);
  if (!url) {
    res
      .status(503)
      .send(`OAuth provider "${provider}" is not configured on the server.`);
    return;
  }
  res.redirect(url);
});

router.get("/auth/:provider/callback", async (req, res) => {
  const provider = req.params.provider as Provider;
  if (!SUPPORTED.includes(provider)) {
    res.status(400).send("Unknown provider");
    return;
  }
  const { code, state, error, error_description } = req.query;
  if (error) {
    logger.warn({ provider, error, error_description }, "OAuth error from provider");
    res.redirect(`/login?oauth_error=${encodeURIComponent(String(error))}`);
    return;
  }
  if (typeof code !== "string" || typeof state !== "string") {
    res.redirect("/login?oauth_error=missing_code");
    return;
  }
  const item = consumeState(state);
  if (!item || item.provider !== provider) {
    res.redirect("/login?oauth_error=bad_state");
    return;
  }

  try {
    const token = await exchangeCode(provider, code);
    const profile = await fetchProfile(provider, token);
    const { userId, created } = await findOrLinkUser(provider, profile);

    const sessionToken = await createSession(userId);
    res.cookie("session_token", sessionToken, {
      httpOnly: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: true,
    });

    const target = item.returnTo && item.returnTo.startsWith("/") ? item.returnTo : "/community";
    logger.info({ provider, userId, created }, "OAuth login success");
    res.redirect(target);
  } catch (e) {
    logger.error({ err: e, provider }, "OAuth callback failed");
    res.redirect(`/login?oauth_error=${encodeURIComponent("callback_failed")}`);
  }
});

export default router;
export { baseUrl };
