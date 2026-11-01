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
