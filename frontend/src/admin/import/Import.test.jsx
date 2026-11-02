// The Topothek import as an editor uses it: links pasted, a place chosen,
// each link harvested in turn with its own result. fetch answers as the API.
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
  part_of_name: null,
};

let harvests;
beforeEach(() => {
  localStorage.setItem("language", "en");
  harvests = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input, init = {}) => {
      const url = new URL(input, window.location.origin);
      if (url.pathname === "/api/admin/me")
        return reply(200, {
          name: "anna",
          scopes: ["read:all", "write", "review", "scrape"],
          roles: ["editor"],
        });
      if (url.pathname === "/api/admin/places/search")
        return reply(
          200,
          url.searchParams.get("q") === "uresch" ? [VILLAGE] : [],
        );
      if (url.pathname === "/api/admin/media/topothek/") {
        const body = JSON.parse(init.body);
        harvests.push(body);
        if (body.url.endsWith("doc=2"))
          return reply(404, { detail: "No Topothek document" });
        return reply(200, {
          created: true,
          title: "Jågl-Kårl, Oberuresch 3",
          media: { id: "m1", status: "new", url: "https://img/1.jpg" },
        });
      }
      return reply(404, { detail: "Not Found" });
    }),
  );
  window.history.replaceState(null, "", "/admin/import");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  reset();
  window.history.replaceState(null, "", "/");
});

test("links are harvested one by one for the chosen place", async () => {
  render(<App />);
  fireEvent.change(await screen.findByLabelText("Links"), {
    target: {
      value: `https://deutsch-reichenau.topothek.at/?doc=1
https://deutsch-reichenau.topothek.at/?doc=2
https://example.org/x`,
    },
  });
  expect(screen.getByText(/2 links found/)).toBeInTheDocument();
  expect(screen.getByText(/1 without/)).toBeInTheDocument();

  const search = screen.getByLabelText("Search a place");
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: "uresch" } });
  fireEvent.click(await screen.findByRole("option", { name: /Oberuresch/ }));

  fireEvent.click(screen.getByRole("button", { name: "Import 2" }));
  expect(
    await screen.findByText("1 new, 0 already there, 1 failed."),
  ).toBeInTheDocument();
  expect(harvests).toEqual([
    { url: "https://deutsch-reichenau.topothek.at/?doc=1", places: ["v1"] },
    { url: "https://deutsch-reichenau.topothek.at/?doc=2", places: ["v1"] },
  ]);
  expect(
    screen.getByRole("link", { name: "Jågl-Kårl, Oberuresch 3" }),
  ).toHaveAttribute("href", "/admin?type=media&status=new&open=m1");
  expect(
    screen.getByText("This document doesn't exist in the Topothek."),
  ).toBeInTheDocument();
});

test("the import is offered only to those who may write", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input) => {
      const url = new URL(input, window.location.origin);
      if (url.pathname === "/api/admin/me")
        return reply(200, { name: "x", scopes: ["read:all"], roles: [] });
      return reply(200, { total: 0, items: [] });
    }),
  );
  render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe("/admin"));
  expect(
    screen.queryByRole("link", { name: "Import" }),
  ).not.toBeInTheDocument();
});
