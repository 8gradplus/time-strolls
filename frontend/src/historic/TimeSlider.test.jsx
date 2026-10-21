import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { LanguageProvider } from "../LanguageContext";
import TimeSlider from "./TimeSlider";

const time = (datetime, title) => ({
  layers: [{ title, datetime: [datetime] }],
});

const times = {
  1952: time("1952", "Historická ortofotomapa"),
  2025: time("2025-06", "Ortofoto ČR"),
};

const renderSlider = (props) =>
  render(
    <LanguageProvider>
      <TimeSlider years={["1952", "2025"]} times={times} {...props} />
    </LanguageProvider>,
  );

beforeEach(() => localStorage.setItem("language", "de"));
afterEach(cleanup);

describe("TimeSlider", () => {
  test("shows only years; the sources are in the menu", () => {
    renderSlider({ year: "2025", onChange: vi.fn() });
    expect(screen.getByRole("button", { name: "2025" })).toBeInTheDocument();
    expect(screen.queryByText(/Juni/)).not.toBeInTheDocument();
    expect(screen.queryByText("Ortofoto ČR")).not.toBeInTheDocument();
  });

  test("picks a year, and off switches the imagery off", () => {
    const onChange = vi.fn();
    renderSlider({ year: "1952", onChange });
    fireEvent.click(screen.getByRole("button", { name: "2025" }));
    expect(onChange).toHaveBeenCalledWith("2025");
    fireEvent.click(screen.getByRole("button", { name: "Aus" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  test("marks off as pressed when no year is chosen", () => {
    renderSlider({ year: null, onChange: vi.fn() });
    expect(screen.getByRole("button", { name: "Aus" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("flags AI-generated imagery", () => {
    const ai = { layers: [{ title: "KI", ai_generated: true }] };
    renderSlider({
      year: "1952",
      times: { ...times, 1952: ai },
      onChange: vi.fn(),
    });
    expect(screen.getByText("KI-generiert")).toBeInTheDocument();
  });

  test("hides when no year is in view and none is chosen", () => {
    const { container } = render(
      <LanguageProvider>
        <TimeSlider years={[]} times={times} year={null} onChange={vi.fn()} />
      </LanguageProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
