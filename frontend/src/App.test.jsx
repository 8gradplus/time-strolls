import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
