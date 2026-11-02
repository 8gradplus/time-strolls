// Requests to the admin API with the signed-in person's token. On a 401 the
// token is refreshed once and the request repeated; locally (no sign-in) the
// API answers without a token.
import { accessToken } from "./auth";

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : `HTTP ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

const send = (path, init, token) =>
  fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

// The response's JSON, or an ApiError with the API's detail
export async function adminFetch(path, init = {}) {
  let token = await accessToken();
  let response = await send(path, init, token);
  if (response.status === 401 && token) {
    token = await accessToken({ force: true });
    if (token) response = await send(path, init, token);
  }
  const body =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.detail);
  return body;
}

export const adminApi = {
  me: "/api/admin/me",
};

// The review list of one type in a status ({total, items}), a page at a time
export const reviewList = ({ type, status, kind, offset = 0, limit = 50 }) =>
  adminFetch(
    `/api/admin/review/?${new URLSearchParams({
      type,
      status,
      offset,
      limit,
      ...(kind ? { kind } : {}),
    })}`,
  );

// One resource with its texts, links and sources
export const resourceDetail = (id) => adminFetch(`/api/admin/resources/${id}`);

export const resourceHistory = (id) =>
  adminFetch(`/api/admin/resources/${id}/history`);

// Several at once: {done, errors: [{item, error}]}
export const setStatuses = (ids, status, reason) =>
  adminFetch("/api/admin/resources/status", {
    method: "POST",
    body: JSON.stringify({ ids, status, ...(reason ? { reason } : {}) }),
  });

// "{n} selected" with n filled in
export const fill = (text, values) =>
  text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");

// Accounts (admins) and tokens (ROADMAP.md, PR 6a) --------------------------

const post = (path, body) =>
  adminFetch(path, {
    method: "POST",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const account = (name) => `/api/admin/accounts/${encodeURIComponent(name)}`;

// Every account with its active roles and whether the person signed in yet
export const accountList = () => adminFetch("/api/admin/accounts/");
export const invite = (email, role) =>
  post("/api/admin/invites/", { email, role });
export const grantRole = (name, role) =>
  post(`${account(name)}/roles`, { role });
export const revokeRole = (id) => post(`/api/admin/roles/${id}/revoke`);

// Tokens of an account (admins) or one's own; a new one carries `token`, once
export const accountTokens = (name) => adminFetch(`${account(name)}/tokens`);
export const createToken = (name, data) =>
  post(`${account(name)}/tokens`, data);
export const ownTokens = () => adminFetch("/api/admin/me/tokens");
export const createOwnToken = (data) => post("/api/admin/me/tokens", data);
export const revokeToken = (id) => post(`/api/admin/tokens/${id}/revoke`);

// What a role may do, as in the API (service/accounts.py ROLES)
export const ROLES = ["editor", "admin"];
export const TOKEN_SCOPES = ["read:all", "write", "review", "scrape", "admin"];
export const roleScopes = {
  editor: ["read:all", "write", "review", "scrape"],
  admin: TOKEN_SCOPES,
};

// Places and the Topothek import (ROADMAP.md, PR 6b) -------------------------

// Places of any status by name (a part of it) and/or near a point, with the
// name of their village (part_of_name)
export const searchPlaces = ({ q, lat, lon, kind, limit = 20 }) =>
  adminFetch(
    `/api/admin/places/search?${new URLSearchParams(
      Object.entries({ q, lat, lon, kind, limit }).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    )}`,
  );

// One Topothek document as new media showing these places (ids or slugs):
// {media, created, title}; a document harvested before is not added again
export const harvestTopothek = (url, places) =>
  post("/api/admin/media/topothek/", { url, places });

// Places and texts (ROADMAP.md, PR 6c) ----------------------------------------

export const PLACE_KINDS = [
  "village",
  "hamlet",
  "house",
  "farm",
  "chapel",
  "church",
  "wayside_shrine",
  "mill",
  "ruin",
  "landmark",
];
// The languages the app shows; texts in others stay as they are
export const LANGS = ["de", "cs", "en"];

export const getPlace = (key) =>
  adminFetch(`/api/admin/places/${encodeURIComponent(key)}`);

// {name, lang, kind, lat, lon, force?}; a place that looks like an existing
// one is refused (409, the detail names it) unless force
export const createPlace = (data) => post("/api/admin/places/", data);

// {kind?, lat?, lon?}: the slug stays
export const updatePlace = (id, data) =>
  adminFetch(`/api/admin/places/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const link = (subject, predicate, object) =>
  post("/api/admin/relations/", { subject, predicate, object });
export const unlink = (id) =>
  adminFetch(`/api/admin/relations/${id}`, { method: "DELETE" });

const text = (id, field, lang) =>
  `/api/admin/resources/${id}/texts/${field}/${encodeURIComponent(lang)}`;

// Adds or replaces a text: an own original, or a translation (method human,
// translated_from); an original from a source is edited with editText
export const putText = (id, field, lang, data) =>
  adminFetch(text(id, field, lang), {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Edits an original from a source, marked as edited, with a note why
export const editText = (id, field, lang, body, note) =>
  adminFetch(text(id, field, lang), {
    method: "PATCH",
    body: JSON.stringify({ body, note }),
  });
