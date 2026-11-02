// Accounts and tokens as an admin and an editor use them: inviting, roles,
// a new token shown once, one's own tokens. fetch answers as the API would.
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { vi } from "vitest";
import App from "../../App";
import { reset } from "../auth";

const ANNA = {
  id: "a1",
  kind: "human",
  name: "anna@example.org",
  email: "anna@example.org",
  operated_by: null,
  created_at: "2026-11-01T10:00:00Z",
  roles: [{ id: "r1", role: "editor", area: null }],
  signed_in: false,
};
const CLAUDE = {
  id: "a2",
  kind: "agent",
  name: "claude",
  email: null,
  operated_by: "admin",
  created_at: "2026-10-24T10:00:00Z",
  roles: [],
  signed_in: false,
};
const TOKEN = {
  id: "t1",
  name: "laptop",
  scopes: ["read:all", "write"],
  created_at: "2026-11-01T10:00:00Z",
  last_used_at: null,
  revoked_at: null,
};

const reply = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

let calls;
const stub = (me) => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input, init = {}) => {
      const url = new URL(input, window.location.origin);
      const body = init.body ? JSON.parse(init.body) : null;
      calls.push({ path: url.pathname, method: init.method ?? "GET", body });
      const path = url.pathname;
      if (path === "/api/admin/me") return reply(200, me);
      if (path === "/api/admin/review/")
        return reply(200, { total: 0, items: [] });
      if (path === "/api/admin/accounts/") return reply(200, [ANNA, CLAUDE]);
      if (path === "/api/admin/invites/")
        return reply(201, { ...ANNA, name: body.email, email: body.email });
      if (path.endsWith("/roles")) return reply(201, { id: "r2", ...body });
      if (path.startsWith("/api/admin/roles/")) return reply(200, {});
      if (path.endsWith("/tokens") && init.method === "POST")
        return reply(201, { ...TOKEN, id: "t2", ...body, token: "ts_secret" });
      if (path.endsWith("/tokens")) return reply(200, [TOKEN]);
      if (path.startsWith("/api/admin/tokens/"))
        return reply(200, { ...TOKEN, revoked_at: "2026-11-02T10:00:00Z" });
      return reply(404, { detail: "Not Found" });
    }),
  );
};

const ADMIN = { name: "admin", scopes: ["admin"], roles: [] };
const EDITOR = {
  name: "anna@example.org",
  scopes: ["read:all", "review", "scrape", "write"],
  roles: ["editor"],
};

const posts = (part) =>
  calls.filter((c) => c.method === "POST" && c.path.includes(part));

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

const open = (path, me = ADMIN) => {
  stub(me);
  window.history.replaceState(null, "", path);
  render(<App />);
};

test("an admin invites a person with a role", async () => {
  open("/admin/accounts");
  expect(await screen.findByText("anna@example.org")).toBeInTheDocument();
  expect(screen.getByText(/Editor · not signed in yet/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "ben@example.org" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Invite" }));
  expect(
    await screen.findByText("ben@example.org is invited."),
  ).toBeInTheDocument();
  expect(posts("/invites/")[0].body).toEqual({
    email: "ben@example.org",
    role: "editor",
  });
});

test("an open account grants a role and makes a token, shown once", async () => {
  open("/admin/accounts?open=anna%40example.org");
  const add = await screen.findByRole("button", { name: "Admin" });
  fireEvent.click(add);
  await waitFor(() =>
    expect(posts("/accounts/anna%40example.org/roles")[0].body).toEqual({
      role: "admin",
    }),
  );
  expect(await screen.findByText("laptop")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "script" },
  });
  // a person's token offers only what their role allows
  expect(screen.queryByLabelText("Manage accounts")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create token" }));
  const shown = await screen.findByRole("status");
  expect(within(shown).getByText("ts_secret")).toBeInTheDocument();
  expect(posts("/accounts/anna%40example.org/tokens")[0].body).toEqual({
    name: "script",
    scopes: ["read:all", "write", "review", "scrape"],
  });
});

test("revoking a token asks once more", async () => {
  open("/admin/me", EDITOR);
  expect(await screen.findByText("laptop")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
  expect(posts("/tokens/")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Really revoke" }));
  await waitFor(() =>
    expect(posts("/api/admin/tokens/t1/revoke")).toHaveLength(1),
  );
});

test("an editor makes their own tokens but sees no accounts", async () => {
  open("/admin/me", EDITOR);
  expect(await screen.findByText("laptop")).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Accounts" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/\/api\/mcp\/admin$/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Claude Code" },
  });
  fireEvent.click(screen.getByLabelText("Publish"));
  fireEvent.click(screen.getByRole("button", { name: "Create token" }));
  expect(await screen.findByText("ts_secret")).toBeInTheDocument();
  expect(posts("/api/admin/me/tokens")[0].body).toEqual({
    name: "Claude Code",
    scopes: ["read:all", "write", "scrape"],
  });
});

test("the accounts page is only for admins", async () => {
  open("/admin/accounts", EDITOR);
  await waitFor(() => expect(window.location.pathname).toBe("/admin"));
});
