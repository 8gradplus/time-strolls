import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";
import { MANIFEST_URL } from "./historic/manifest";

const manifest = {
  version: 1,
  times: {
    1928: { bounds: [13.08, 52.33, 13.77, 52.68], layers: [] },
    1952: { bounds: [14.0, 48.58, 14.16, 48.68], layers: [] },
  },
  regions: {
    sumava: {
      title: { de: "Böhmerwald", cs: "Šumava", en: "Bohemian Forest" },
      countries: ["CZ", "AT"],
      bounds: [13.74, 48.58, 14.34, 48.85],
      times: ["1952"],
    },
    berlin: {
      title: { en: "Berlin" },
      countries: ["DE"],
      bounds: [13.08, 52.33, 13.77, 52.68],
      times: ["1928"],
    },
  },
};

const json = (data) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => json(url === MANIFEST_URL ? manifest : [])),
  );
  // jsdom has no geolocation API
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: { watchPosition: vi.fn(() => 1), clearWatch: vi.fn() },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

test("renders the map and loads locations", async () => {
  const { container } = render(<App />);
  expect(container.querySelector(".leaflet-container")).toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/locations/"));
});

test("maps an old historic=true link to the earliest year in our region", async () => {
  window.history.replaceState(null, "", "/?historic=true&markers=false");
  render(<App />);
  await waitFor(() => {
    const params = new URLSearchParams(window.location.search);
    expect(params.get("year")).toBe("1952");
    expect(params.has("historic")).toBe(false);
    expect(params.get("markers")).toBe("false");
  });
});

test("offers a retry when the places fail to load", async () => {
  localStorage.setItem("language", "de");
  fetch.mockImplementation((url) =>
    url === "/api/locations/"
      ? Promise.resolve({ ok: false })
      : json(url === MANIFEST_URL ? manifest : []),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(<App />);
  const retry = await screen.findByRole("button", { name: "Erneut versuchen" });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Die Orte konnten nicht geladen werden.",
  );

  fetch.mockImplementation((url) => json(url === MANIFEST_URL ? manifest : []));
  fireEvent.click(retry);
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
});

test("one location button follows the user and goes back to the area", async () => {
  localStorage.setItem("language", "de");
  window.history.replaceState(null, "", "/?centered=false");
  render(<App />);

  fireEvent.click(
    screen.getByRole("button", { name: "Meinem Standort folgen" }),
  );
  let params = new URLSearchParams(window.location.search);
  expect(params.get("track")).toBe("follow");
  expect(params.has("centered")).toBe(false);

  fireEvent.click(screen.getByRole("button", { name: "Gebiet zeigen" }));
  params = new URLSearchParams(window.location.search);
  expect(params.has("track")).toBe(false);
});

test("the sources page in the menu lists the sources of the selected year", async () => {
  localStorage.setItem("language", "de");
  const withSources = {
    version: 1,
    times: {
      1952: {
        bounds: [14.0, 48.58, 14.16, 48.68],
        layers: [
          {
            id: "a",
            url: "a/1952/{z}/{x}/{y}.webp",
            bounds: [14.0, 48.58, 14.16, 48.68],
            min_zoom: 10,
            max_native_zoom: 17,
            attribution: "CENIA",
            licence: "CC-BY-4.0",
          },
        ],
      },
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => json(url === MANIFEST_URL ? withSources : [])),
  );
  window.history.replaceState(null, "", "/?year=1952");
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Menü" }));
  const menu = await screen.findByRole("dialog", { name: "Menü" });
  fireEvent.click(within(menu).getByRole("button", { name: "Quellen" }));
  expect(
    await within(menu).findByText("CENIA (CC-BY-4.0)"),
  ).toBeInTheDocument();
  expect(within(menu).getByText("OpenStreetMap")).toBeInTheDocument();

  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

test("the menu lists the areas and marks the one in view", async () => {
  localStorage.setItem("language", "de");
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Menü" }));
  const menu = await screen.findByRole("dialog", { name: "Menü" });
  const sumava = await within(menu).findByRole("button", {
    name: /Böhmerwald/,
  });
  expect(sumava).toHaveTextContent("Hier");
  expect(sumava).toHaveTextContent("CZ · AT · 1952");
  expect(
    within(menu).getByRole("button", { name: /Berlin/ }),
  ).not.toHaveTextContent("Hier");
  expect(within(menu).queryByText(/Weitere Gebiete/)).not.toBeInTheDocument();
});

test("the dock folds into the year and the logo, and remembers it", async () => {
  localStorage.setItem("language", "de");
  localStorage.removeItem("dockFolded");
  window.history.replaceState(null, "", "/?year=1952");
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Leiste einklappen" }));
  const pill = screen.getByRole("button", { name: "Leiste öffnen" });
  expect(pill).toHaveTextContent("1952");
  expect(localStorage.getItem("dockFolded")).toBe("true");

  fireEvent.click(pill);
  expect(localStorage.getItem("dockFolded")).toBe("false");
});

test("the appearance button steps through the colour modes", async () => {
  localStorage.setItem("language", "de");
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Menü" }));
  const menu = await screen.findByRole("dialog", { name: "Menü" });
  fireEvent.click(
    within(menu).getByRole("button", { name: "Darstellung: Automatisch" }),
  );
  expect(
    within(menu).getByRole("button", { name: "Darstellung: Hell" }),
  ).toBeInTheDocument();
});
