// Places and texts as an editor changes them: a new place (a village by
// default, without "part of"; as a house refused as a duplicate, then
// created anyway, linked to its village), an original from
// a source edited with a note, a translation added, the places a photo
// shows changed. fetch answers as the API.
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { vi } from "vitest";
import App from "../../App";
import { reset } from "../auth";
import { parsePoint } from "./MapPicker";

const reply = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const VILLAGE = {
  id: "v1",
  slug: "oberuresch",
  name: "Oberuresch",
  kind: "village",
  status: "published",
  lat: 48.609,
  lon: 14.056,
  distance_m: 40,
  part_of_name: null,
};

let calls;
beforeEach(() => {
  localStorage.setItem("language", "en");
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input, init = {}) => {
      const url = new URL(input, window.location.origin);
      const method = init.method ?? "GET";
      const body = init.body ? JSON.parse(init.body) : null;
      calls.push({ path: url.pathname, method, body });
      const path = url.pathname;
      if (path === "/api/admin/me")
        return reply(200, {
          name: "anna",
          scopes: ["read:all", "write", "review", "scrape"],
          roles: ["editor"],
        });
      if (path === "/api/admin/places/search") return reply(200, [VILLAGE]);
      if (path === "/api/admin/places/" && method === "POST")
        return body.force
          ? reply(201, { id: "p9", status: "new", ...body })
          : reply(409, {
              detail:
                "looks like an existing place: Oberuresch 3 (oberuresch-3, house, 12 m)",
            });
      if (path === "/api/admin/relations/") return reply(201, { id: "r9" });
      if (path.startsWith("/api/admin/relations/") && method === "DELETE")
        return new Response(null, { status: 204 });
      if (path === "/api/admin/review/")
        return reply(200, {
          total: 1,
          items: [
            {
              id: "m1",
              type: "media",
              status: "new",
              label: "Wer kennt diese Leute?",
              places: [],
              created_at: "2026-11-01T10:00:00Z",
            },
          ],
        });
      if (path === "/api/admin/resources/m1")
        return reply(200, {
          resource: { id: "m1", type: "media", status: "new" },
          item: {},
          texts: [
            {
              id: "t1",
              field: "title",
              lang: "de",
              body: "Wer kennt diese Leute?",
              method: "original",
              is_primary: true,
              source_record_id: "s1",
            },
          ],
          relations: [],
          shows: [
            {
              relation_id: "r1",
              id: "h3",
              slug: "oberuresch-3",
              name: "Oberuresch 3",
              kind: "house",
              status: "published",
              part_of_name: "Oberuresch",
            },
          ],
          sources: [],
          verbatim: {},
        });
      if (path.startsWith("/api/admin/resources/m1/texts/"))
        return reply(200, { id: "t2" });
      if (path.endsWith("/history")) return reply(200, []);
      return reply(404, { detail: "Not Found" });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  reset();
  window.history.replaceState(null, "", "/");
});

const sent = (path, method) =>
  calls.filter((c) => c.path === path && c.method === method);

test("coordinates are read as Google Maps copies them", () => {
  expect(parsePoint("48.6090, 14.0562")).toEqual({ lat: 48.609, lon: 14.0562 });
  expect(parsePoint("48,6090; 14,0562")).toEqual({ lat: 48.609, lon: 14.0562 });
  expect(parsePoint("Oberuresch 3")).toBeNull();
  expect(parsePoint("148.1, 14.0")).toBeNull();
});

test("a new place refused as a duplicate is created anyway, in its village", async () => {
  window.history.replaceState(null, "", "/admin/places/new");
  render(<App />);
  fireEvent.change(await screen.findByLabelText("Name"), {
    target: { value: "Oberuresch 3a" },
  });
  // a village by default, which isn't part of a village
  const kind = screen.getByRole("combobox", { name: "Kind" });
  expect(kind).toHaveTextContent("Village");
  expect(screen.queryByLabelText("Search a village (optional)")).toBeNull();
  fireEvent.mouseDown(kind);
  fireEvent.click(await screen.findByRole("option", { name: "House" }));
  const search = screen.getByLabelText("Search a village (optional)");
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: "uresch" } });
  fireEvent.click(await screen.findByRole("option", { name: /Oberuresch/ }));
  fireEvent.change(screen.getByLabelText("Coordinates"), {
    target: { value: "48.6091, 14.0563" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /exists already.*Oberuresch 3 \(oberuresch-3/,
  );
  expect(sent("/api/admin/places/", "POST")[0].body).toEqual({
    name: "Oberuresch 3a",
    lang: "de",
    kind: "house",
    lat: 48.6091,
    lon: 14.0563,
  });

  fireEvent.click(screen.getByRole("button", { name: /create it anyway/ }));
  await waitFor(() => expect(window.location.pathname).toBe("/admin"));
  expect(sent("/api/admin/places/", "POST")[1].body.force).toBe(true);
  expect(sent("/api/admin/relations/", "POST")[0].body).toEqual({
    subject: "p9",
    predicate: "part_of",
    object: "v1",
  });
  expect(new URLSearchParams(window.location.search).get("open")).toBe("p9");
});

test("an original from a source is edited with a note; a translation is added", async () => {
  window.history.replaceState(null, "", "/admin?type=media&open=m1");
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Title · DE"), {
    target: { value: "Familie vor dem Haus" },
  });
  const save = screen.getByRole("button", { name: "Save" });
  // without a note it can't be saved
  expect(save).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Why changed"), {
    target: { value: "removed a call for information" },
  });
  fireEvent.click(save);
  await waitFor(() =>
    expect(sent("/api/admin/resources/m1/texts/title/de", "PATCH")).toEqual([
      {
        path: "/api/admin/resources/m1/texts/title/de",
        method: "PATCH",
        body: {
          body: "Familie vor dem Haus",
          note: "removed a call for information",
        },
      },
    ]),
  );

  fireEvent.click(await screen.findByRole("button", { name: "+ EN" }));
  fireEvent.change(screen.getByLabelText("Title · EN"), {
    target: { value: "Family in front of the house" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(
      sent("/api/admin/resources/m1/texts/title/en", "PUT")[0].body,
    ).toEqual({
      body: "Family in front of the house",
      method: "human",
      translated_from: "de",
    }),
  );
});

test("the places a photo shows are removed and added at once", async () => {
  window.history.replaceState(null, "", "/admin?type=media&open=m1");
  render(<App />);
  const chip = await screen.findByRole("button", { name: "Oberuresch 3" });
  fireEvent.keyDown(chip, { key: "Backspace" });
  await waitFor(() =>
    expect(sent("/api/admin/relations/r1", "DELETE")).toHaveLength(1),
  );

  const search = screen.getByLabelText("Add a place");
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: "uresch" } });
  fireEvent.click(await screen.findByRole("option", { name: /Oberuresch/ }));
  await waitFor(() =>
    expect(sent("/api/admin/relations/", "POST")[0].body).toEqual({
      subject: "m1",
      predicate: "shows",
      object: "v1",
    }),
  );
});
