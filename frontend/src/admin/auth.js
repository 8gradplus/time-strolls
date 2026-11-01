// Signing in to the admin (ROADMAP.md, step 5): a standard OAuth 2.1 public
// client of our own authorization server (the API, which forwards the login
// to Google). oauth4webapi does PKCE, the checks and the token requests.
//
// - The admin registers itself once (dynamic client registration) and keeps
//   its client in localStorage.
// - The access token stays in memory, the refresh token in sessionStorage:
//   both are gone when the tab closes.
// - Every request goes to our own origin. In development Vite forwards /api
//   and the metadata to the API (production by default), so the endpoints
//   the server names are taken by their path only.
import * as oauth from "oauth4webapi";

const CLIENT = "admin.client";
const REFRESH = "admin.refresh";
const PENDING = "admin.pending";
const SCOPE = "openid https://www.googleapis.com/auth/userinfo.email";
const METADATA = "/.well-known/oauth-authorization-server/api";

const read = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};

const write = (storage, key, value) => {
  try {
    if (value == null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode: this visit only
  }
};

export const redirectUri = () => `${window.location.origin}/admin/callback`;

// http only on localhost (development); the library refuses it otherwise
const options = () => ({
  [oauth.allowInsecureRequests]: window.location.protocol === "http:",
});

const sameOrigin = (url) =>
  url ? new URL(new URL(url).pathname, window.location.origin).href : url;

let server = null;

// The authorization server, or null where there is no sign-in (locally)
export async function authorizationServer() {
  if (server) return server;
  const response = await fetch(METADATA);
  if (!response.ok) return null;
  const metadata = await response.json();
  server = {
    ...metadata,
    authorization_endpoint: sameOrigin(metadata.authorization_endpoint),
    token_endpoint: sameOrigin(metadata.token_endpoint),
    registration_endpoint: sameOrigin(metadata.registration_endpoint),
  };
  return server;
}

async function client(as) {
  const stored = read(localStorage, CLIENT);
  if (stored?.redirect_uris?.includes(redirectUri())) return stored;
  const response = await oauth.dynamicClientRegistrationRequest(
    as,
    {
      client_name: "Time Strolls admin",
      redirect_uris: [redirectUri()],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: SCOPE,
    },
    options(),
  );
  const registered =
    await oauth.processDynamicClientRegistrationResponse(response);
  write(localStorage, CLIENT, registered);
  return registered;
}

// Tokens -------------------------------------------------------------------------

let access = null; // { token, expiresAt }

const keep = (tokens) => {
  access = {
    token: tokens.access_token,
    // a minute early, so a request doesn't start with a token about to expire
    expiresAt: Date.now() + ((tokens.expires_in ?? 3600) - 60) * 1000,
  };
  if (tokens.refresh_token)
    write(sessionStorage, REFRESH, tokens.refresh_token);
};

export const hasSession = () =>
  Boolean(access || read(sessionStorage, REFRESH));

// A valid access token: the one in memory, else one from the refresh token,
// else null (signed out). force: refresh even if the one in memory is valid.
export async function accessToken({ force = false } = {}) {
  if (access && !force && access.expiresAt > Date.now()) return access.token;
  const refresh = read(sessionStorage, REFRESH);
  if (!refresh) return null;
  const as = await authorizationServer();
  if (!as) return null;
  try {
    const c = await client(as);
    const response = await oauth.refreshTokenGrantRequest(
      as,
      c,
      oauth.None(),
      refresh,
      options(),
    );
    keep(await oauth.processRefreshTokenResponse(as, c, response));
    return access.token;
  } catch {
    signOut();
    return null;
  }
}

// Signing in ---------------------------------------------------------------------

// Off to our authorization server (then our consent page, then Google);
// back at /admin/callback. back: where to return in the admin afterwards.
export async function signIn(back = "/admin") {
  const as = await authorizationServer();
  if (!as) throw new Error("no sign-in on this server");
  const c = await client(as);
  const verifier = oauth.generateRandomCodeVerifier();
  const state = oauth.generateRandomState();
  write(sessionStorage, PENDING, { verifier, state, back });
  const url = new URL(as.authorization_endpoint);
  url.search = new URLSearchParams({
    client_id: c.client_id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    code_challenge: await oauth.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state,
  });
  window.location.assign(url.href);
}

// At /admin/callback: the code for tokens. Returns where to go back to.
// Once per callback URL: React's StrictMode runs effects twice in
// development, and a code can be exchanged only once.
let completing = null;

export function completeSignIn(currentUrl = window.location.href) {
  if (completing?.url !== currentUrl)
    completing = { url: currentUrl, promise: exchange(currentUrl) };
  return completing.promise;
}

async function exchange(currentUrl) {
  const pending = read(sessionStorage, PENDING);
  write(sessionStorage, PENDING, null);
  if (!pending) throw new Error("no sign-in in progress");
  const as = await authorizationServer();
  const c = await client(as);
  try {
    const params = oauth.validateAuthResponse(
      as,
      c,
      new URL(currentUrl),
      pending.state,
    );
    const response = await oauth.authorizationCodeGrantRequest(
      as,
      c,
      oauth.None(),
      params,
      redirectUri(),
      pending.verifier,
      options(),
    );
    keep(await oauth.processAuthorizationCodeResponse(as, c, response));
  } catch (error) {
    // the server may have forgotten the client: register again next time
    write(localStorage, CLIENT, null);
    throw error;
  }
  return pending.back || "/admin";
}

export function signOut() {
  access = null;
  write(sessionStorage, REFRESH, null);
}

// For tests: forget what this module keeps in memory
export function reset() {
  access = null;
  server = null;
  completing = null;
}
