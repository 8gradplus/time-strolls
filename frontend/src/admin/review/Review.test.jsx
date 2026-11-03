// The review list as an editor uses it: the rows of a type and status,
// publishing several at once with an undo, muting with a reason, the detail
// panel. fetch answers as the API would (local mode: no sign-in).
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

const ROWS = [
  {
    id: "p1",
    type: "place",
    status: "new",
    label: "Obermarkschlag 26",
    kind: "house",
    places: ["Obermarkschlag"],
    created_by: "claude",
    created_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "p2",
    type: "place",
    status: "new",
    label: "Rosenhügel 6",
    kind: "house",
    places: ["Rosenhügel"],
    created_by: "claude",
    created_at: "2026-10-31T10:00:00Z",
  },
];

const reply = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

let calls;
const stub = () => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input, init = {}) => {
      const url = new URL(input, window.location.origin);
      calls.push({ path: url.pathname, query: url.searchParams, init });
      if (url.pathname === "/api/admin/me")
        return reply(200, { name: "admin", scopes: ["admin"], roles: [] });
      if (url.pathname === "/api/admin/review/")
        return reply(200, {
          total: url.searchParams.get("status") === "new" ? 2 : 0,
          items: url.searchParams.get("status") === "new" ? ROWS : [],
        });
      if (url.pathname === "/api/admin/resources/status") {
        const { ids } = JSON.parse(init.body);
        return reply(200, { done: ids.length, errors: [] });
      }
      if (url.pathname === "/api/admin/resources/p1")
        return reply(200, {
          resource: { id: "p1", type: "place", status: "new" },
          item: { name: "Obermarkschlag 26", slug: "obermarkschlag-26" },
          texts: [
            {
              id: "t1",
              field: "name",
              lang: "de",
              body: "Obermarkschlag 26",
              method: "original",
            },
            {
              id: "t2",
              field: "name",
              lang: "cs",
              body: "Horní Příbrání 26",
              method: "machine",
              model: "claude",
            },
          ],
          relations: [],
          sources: [{ url: "https://archive.example/house/26" }],
          verbatim: {},
        });
      if (url.pathname === "/api/admin/resources/p1/history")
        return reply(200, [
          { id: 1, at: "2026-11-01T10:00:00Z", action: "create", diff: {} },
        ]);
      return reply(404, { detail: "Not Found" });
    }),
  );
};

const statusCalls = () =>
  calls
    .filter((c) => c.path === "/api/admin/resources/status")
    .map((c) => JSON.parse(c.init.body));

beforeEach(() => {
  localStorage.setItem("language", "en");
  stub();
  window.history.replaceState(null, "", "/admin");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  reset();
  window.history.replaceState(null, "", "/");
});

test("it lists what waits for review, with kind, village and author", async () => {
  render(<App />);
  expect(await screen.findByText("Obermarkschlag 26")).toBeInTheDocument();
  expect(
    screen.getByText(/House · Obermarkschlag · by claude/),
  ).toBeInTheDocument();
  const list = calls.find((c) => c.path === "/api/admin/review/");
  expect(list.query.get("type")).toBe("place");
  expect(list.query.get("status")).toBe("new");
});

test("several rows are published at once, and undone", async () => {
  render(<App />);
  await screen.findByText("Obermarkschlag 26");
  fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
  expect(screen.getByText("2 selected")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(await screen.findByText("2 published")).toBeInTheDocument();
  expect(screen.queryByText("Obermarkschlag 26")).not.toBeInTheDocument();
  expect(statusCalls()[0]).toEqual({ ids: ["p1", "p2"], status: "published" });
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(statusCalls()[1]).toEqual({ ids: ["p1", "p2"], status: "new" }),
  );
  expect(await screen.findByText("Obermarkschlag 26")).toBeInTheDocument();
});

test("publishing rows without a permission asks first", async () => {
  ROWS[1].may_show = false;
  try {
    render(<App />);
    await screen.findByText("Obermarkschlag 26");
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("1 of the 2 selected have no permission.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(statusCalls()).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Publish anyway" }),
    );
    expect(await screen.findByText("2 published")).toBeInTheDocument();
    expect(statusCalls()[0]).toEqual({
      ids: ["p1", "p2"],
      status: "published",
    });
  } finally {
    delete ROWS[1].may_show;
  }
});

test("muting asks for a reason", async () => {
  render(<App />);
  await screen.findByText("Rosenhügel 6");
  fireEvent.click(screen.getByRole("checkbox", { name: "Rosenhügel 6" }));
  fireEvent.click(screen.getByRole("button", { name: "Mute" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Reason (optional)"), {
    target: { value: "3 km off" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Mute" }));
  expect(await screen.findByText("1 muted")).toBeInTheDocument();
  expect(statusCalls()[0]).toEqual({
    ids: ["p2"],
    status: "muted",
    reason: "3 km off",
  });
});

test("a row opens its details: texts per language and the source", async () => {
  render(<App />);
  fireEvent.click(await screen.findByText("Obermarkschlag 26"));
  expect(await screen.findByText("Horní Příbrání 26")).toBeInTheDocument();
  expect(screen.getByText(/Machine translation · claude/)).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "https://archive.example/house/26" }),
  ).toBeInTheDocument();
  // the open item is in the URL, so the view can be linked
  expect(new URLSearchParams(window.location.search).get("open")).toBe("p1");
});

test("an admin deletes a row for good, after a confirmation", async () => {
  render(<App />);
  fireEvent.click(await screen.findByText("Obermarkschlag 26"));
  fireEvent.click(
    await screen.findByRole("button", { name: "Delete for good" }),
  );
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent("Delete “Obermarkschlag 26” for good?");
  expect(dialog).toHaveTextContent("With 2 texts and 0 links.");
  expect(dialog).toHaveTextContent("The source's record stays");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  expect(await screen.findByText("Deleted")).toBeInTheDocument();
  expect(
    calls.filter(
      (c) => c.path === "/api/admin/resources/p1" && c.init.method === "DELETE",
    ),
  ).toHaveLength(1);
  // the row is gone from the list, and the panel closes
  await waitFor(() =>
    expect(screen.queryAllByText("Obermarkschlag 26")).toHaveLength(0),
  );
});

test("the type and status are in the URL", async () => {
  window.history.replaceState(null, "", "/admin?type=media&status=muted");
  render(<App />);
  expect(await screen.findByText("Nothing here.")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Pictures" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const list = calls.find((c) => c.path === "/api/admin/review/");
  expect(list.query.get("type")).toBe("media");
  expect(list.query.get("status")).toBe("muted");
});
