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
  test("shows the real date and source of the chosen year", () => {
    renderSlider({ year: "2025", onChange: vi.fn() });
    expect(screen.getByText("Juni 2025")).toBeInTheDocument();
    expect(screen.getByText("Ortofoto ČR")).toBeInTheDocument();
  });

  test("picks a year and switches the imagery off", () => {
    const onChange = vi.fn();
    renderSlider({ year: "1952", onChange });
    fireEvent.click(screen.getByRole("button", { name: "Juni 2025" }));
    expect(onChange).toHaveBeenCalledWith("2025");
    fireEvent.click(screen.getByRole("button", { name: "Aus" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  test("marks Off as pressed when no year is chosen", () => {
    renderSlider({ year: null, onChange: vi.fn() });
    expect(screen.getByRole("button", { name: "Aus" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Ohne Luftbild")).toBeInTheDocument();
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
