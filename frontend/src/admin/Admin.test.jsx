// The admin's sign-in as a browser goes through it: locally nobody signs in,
// otherwise the sign-in screen, the way back from our authorization server
// (/admin/callback) and an account without an invitation. fetch answers as
// the API would; Google is never involved.
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "../App";
import { reset } from "./auth";

const ISSUER = "https://timestrolls.debtray.com/api";
const METADATA = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/authorize`,
  token_endpoint: `${ISSUER}/token`,
  registration_endpoint: `${ISSUER}/register`,
  code_challenge_methods_supported: ["S256"],
};
const ME = {
  account_id: "a",
  name: "anna@example.org",
  scopes: [],
  roles: ["editor"],
};

const reply = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

// The API: routes -> handler(request init) returning a Response
const api = (routes) =>
  vi.fn(async (input, init = {}) => {
    const url = new URL(
      input instanceof Request ? input.url : input,
      window.location.origin,
    );
    const handler = routes[url.pathname];
    return handler ? handler(init, url) : reply(404, { detail: "Not Found" });
  });

const open = (path) => {
  window.history.replaceState(null, "", path);
  return render(<App />);
};

beforeEach(() => {
  localStorage.setItem("language", "en");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  reset();
  window.history.replaceState(null, "", "/");
});

test("locally the admin opens without signing in", async () => {
  vi.stubGlobal(
    "fetch",
    api({
      "/api/admin/me": () => reply(200, { ...ME, name: "admin" }),
      "/api/admin/review/": () => reply(200, { total: 0, items: [] }),
    }),
  );
  open("/admin");
  expect(await screen.findByText("Local, no sign-in")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Places" })).toBeInTheDocument();
  expect(screen.queryByText("Sign in with Google")).not.toBeInTheDocument();
});

test("without a session it asks to sign in", async () => {
  vi.stubGlobal(
    "fetch",
    api({
      "/api/admin/me": () =>
        reply(401, { detail: "a bearer token is required" }),
    }),
  );
  open("/admin");
  expect(
    await screen.findByRole("button", { name: "Sign in with Google" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Edit content" }),
  ).toBeInTheDocument();
});

// Back from our authorization server with a code: registered client, PKCE
// verifier and state as signIn() left them
const returning = (meReply) => {
  localStorage.setItem(
    "admin.client",
    JSON.stringify({
      client_id: "client-1",
      redirect_uris: [`${window.location.origin}/admin/callback`],
      token_endpoint_auth_method: "none",
    }),
  );
  sessionStorage.setItem(
    "admin.pending",
    JSON.stringify({ verifier: "v".repeat(43), state: "s1", back: "/admin" }),
  );
  const token = vi.fn(() =>
    reply(200, {
      access_token: "our-token",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "refresh-1",
    }),
  );
  const me = vi.fn((init) => meReply(init.headers?.Authorization));
  vi.stubGlobal(
    "fetch",
    api({
      "/.well-known/oauth-authorization-server/api": () => reply(200, METADATA),
      "/api/token": token,
      "/api/admin/me": me,
    }),
  );
  return { token, me };
};

test("back from signing in, an invited person sees the admin", async () => {
  const { token, me } = returning((auth) =>
    auth === "Bearer our-token" ? reply(200, ME) : reply(401, {}),
  );
  open("/admin/callback?code=c1&state=s1");
  expect(await screen.findByText("anna@example.org")).toBeInTheDocument();
  expect(screen.getByText(/Editor/)).toBeInTheDocument();
  expect(token).toHaveBeenCalledTimes(1); // once, also under StrictMode
  const body = new URLSearchParams(token.mock.calls[0][0].body);
  expect(body.get("code")).toBe("c1");
  expect(body.get("code_verifier")).toBe("v".repeat(43));
  expect(body.get("client_id")).toBe("client-1");
  expect(me).toHaveBeenCalled();
  await waitFor(() => expect(window.location.pathname).toBe("/admin"));
  // the refresh token survives a reload of the tab, the access token doesn't
  expect(JSON.parse(sessionStorage.getItem("admin.refresh"))).toBe("refresh-1");
});

test("a Google account without an invitation is told so", async () => {
  returning(() => reply(401, { detail: "not invited" }));
  open("/admin/callback?code=c1&state=s1");
  expect(
    await screen.findByRole("heading", { name: "Not invited" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Use another account" }),
  ).toBeInTheDocument();
  expect(sessionStorage.getItem("admin.refresh")).toBeNull();
});

test("a wrong state is refused", async () => {
  returning(() => reply(200, ME));
  open("/admin/callback?code=c1&state=forged");
  expect(
    await screen.findByText("Signing in didn't work."),
  ).toBeInTheDocument();
});
