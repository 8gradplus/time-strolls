import { cleanup, render } from "@testing-library/react";
import { vi } from "vitest";
import Track from "./Track";

const map = { on: vi.fn(), off: vi.fn(), flyTo: vi.fn() };
vi.mock("react-leaflet", () => ({
  useMap: () => map,
  Marker: () => null,
}));
vi.mock("../icons", () => ({ currentLocationIcon: () => null }));

const props = {
  fallbackCenter: [48.616, 14.069],
  fallbackZoom: 15,
  onUserInteraction: () => {},
  userInteracted: false,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Track", () => {
  it("flies to the whole area once, not on every new position", () => {
    const { rerender } = render(
      <Track {...props} trackingMode="area" position={null} />,
    );
    rerender(
      <Track {...props} trackingMode="area" position={{ lat: 1, lng: 2 }} />,
    );
    rerender(
      <Track {...props} trackingMode="area" position={{ lat: 1, lng: 2 }} />,
    );
    expect(map.flyTo).toHaveBeenCalledTimes(1);
    expect(map.flyTo.mock.calls[0][0]).toEqual(props.fallbackCenter);
  });

  it("does not fly home after the user moved the map", () => {
    render(
      <Track
        {...props}
        trackingMode="area"
        position={{ lat: 1, lng: 2 }}
        userInteracted
      />,
    );
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it("follows new positions", () => {
    const { rerender } = render(
      <Track {...props} trackingMode="follow" position={{ lat: 1, lng: 2 }} />,
    );
    rerender(
      <Track {...props} trackingMode="follow" position={{ lat: 3, lng: 4 }} />,
    );
    expect(map.flyTo).toHaveBeenCalledTimes(2);
    expect(map.flyTo).toHaveBeenLastCalledWith({ lat: 3, lng: 4 }, 16);
  });
});
