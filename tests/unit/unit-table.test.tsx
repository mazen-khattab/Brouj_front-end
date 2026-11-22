import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DrawCountdown } from "../../src/Features/Projects/Public/DrawCountdown";
import { ProjectFacts } from "../../src/Features/Projects/Public/Facts";
import { UnitTable } from "../../src/Features/Units/Public/UnitTable";
import * as Units from "../../src/Services/Units";
import type { ProjectDto, UnitListDto, PaginationResult } from "../../src/Types/contracts";
import { ApiError } from "../../src/Types/failures";
import { LocaleProvider } from "../../src/Context/LocaleProvider";
import { renderUi } from "../renderUi";

const project: ProjectDto = {
  id: "30000000-0000-4000-8000-000000000001", name: "Project", areaId: "area", description: null,
  latitude: null, longitude: null, size: 1000, projectType: 1, price: 1000000, floorCount: 5,
  plannedUnitCount: 10, neighborPrice: 2000, drawDate: "2030-01-02T03:04:05Z", startingMeterPrice: 900,
  unitSavingPercentage: 25, isGarage: true, garagePrice: null, amenities: [], images: [],
};
const unit: UnitListDto = {
  id: "unit", projectId: project.id, number: "A-1", meterPrice: 1000, floorNumber: 2, size: 100,
  neighborMeterPrice: 2000, totalPrice: 100000, percentage: 5, pricingDate: "2026-11-01T00:00:00Z",
  trend: "North", excellencePercentage: 12.5, unitSavingPercentage: -2.5, finishingDate: "2027-12-01T12:00:00Z",
  stages: [{ stageName: "Structure", stagePrice: 123.4567 }, { stageName: "Finishes", stagePrice: 0 }],
  isAvailable: true, isGarage: true, garagePrice: 0,
};
const data = (number = 1): PaginationResult<UnitListDto> => ({ items: [{ ...unit, number: "A-" + number }], pageNumber: number, pageSize: 12, totalCount: 13, totalPages: 2 });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

test("initiative countdown ticks, expires without negative values, and cleans up", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-02T03:04:03Z"));
  const view = renderUi(<DrawCountdown projectType={1} drawDate={project.drawDate} />);
  expect(screen.getByRole("timer")).toHaveTextContent("Seconds02");
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole("timer")).toHaveTextContent("Seconds01");
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole("timer")).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("The scheduled draw time has arrived.");
  expect(vi.getTimerCount()).toBe(0);
  view.unmount();
});

test.each([{ projectType: 0, drawDate: project.drawDate }, { projectType: 1, drawDate: null }, { projectType: 1, drawDate: "invalid" }])("countdown hides when inappropriate: %o", (props) => {
  const { container } = renderUi(<DrawCountdown {...props} />);
  expect(container.querySelector("section")).toBeNull();
});

test("countdown handles days, timestamp offsets, and unmount cleanup", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
  const view = renderUi(<DrawCountdown projectType={1} drawDate="2030-01-02T04:03:04+02:00" />);
  const timer = screen.getByRole("timer");
  expect(timer).toHaveTextContent("Days01"); expect(timer).toHaveTextContent("Hours02");
  expect(timer).toHaveTextContent("Minutes03"); expect(timer).toHaveTextContent("Seconds04");
  view.unmount(); expect(vi.getTimerCount()).toBe(0);
});

test("project facts retain existing fields and show starting price, savings, and nullable garage price", () => {
  renderUi(<ProjectFacts project={project} />);
  expect(screen.getByText("Starting price per m²")).toBeVisible();
  expect(screen.getByText("25%")).toBeVisible();
  expect(screen.getByText("Project price")).toBeVisible();
  expect(screen.getByText("Not provided")).toBeVisible();
});

test.each(["en", "ar"] as const)("table shows dynamic stages, precise prices, amenities, and initiative share in %s", async (locale) => {
  vi.spyOn(Units, "getUnitsByProject").mockResolvedValue(data());
  const { container } = renderUi(<MemoryRouter><UnitTable project={project} /></MemoryRouter>, locale);
  const table = await screen.findByRole("table");
  expect(within(table).getAllByRole("columnheader")).toHaveLength(15);
  expect(within(table).getByRole("columnheader", { name: "Structure" })).toBeVisible();
  expect(within(table).getByRole("columnheader", { name: "Finishes" })).toBeVisible();
  expect(table).toHaveTextContent("North");
  expect(within(table).getByRole("link")).toHaveAttribute("href", "/projects/" + project.id + "/units/unit");
  expect(table).toHaveTextContent(new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 4 }).format(-0.025));
  expect(table).toHaveTextContent(locale === "en" ? "Elevator: Yes" : "المصعد: نعم");
  expect(container.querySelectorAll("article")).toHaveLength(0);
});

test("regular table omits initiative share and displays absent values", async () => {
  vi.spyOn(Units, "getUnitsByProject").mockResolvedValue({ ...data(), items: [{ ...unit, stages: [], neighborMeterPrice: null, unitSavingPercentage: null, finishingDate: null }] });
  renderUi(<MemoryRouter><UnitTable project={{ ...project, projectType: 0 }} /></MemoryRouter>);
  const table = await screen.findByRole("table");
  expect(within(table).queryByRole("columnheader", { name: "Share percentage" })).toBeNull();
  expect(within(table).getAllByRole("columnheader")).toHaveLength(12);
  expect(within(table).getAllByText("Not provided")).toHaveLength(3);
});

test("clicking a data cell navigates to the unit details route", async () => {
  vi.spyOn(Units, "getUnitsByProject").mockResolvedValue(data());
  renderUi(<MemoryRouter><Routes><Route path="/" element={<UnitTable project={project} />} /><Route path="/projects/:projectId/units/:unitId" element={<h1>Unit details destination</h1>} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByText("North"));
  expect(await screen.findByRole("heading", { name: "Unit details destination" })).toBeVisible();
});

test("pagination retries a failed page and returns to the first page", async () => {
  const read = vi.spyOn(Units, "getUnitsByProject").mockResolvedValueOnce(data()).mockRejectedValueOnce(new ApiError("transport", { status: 503 })).mockResolvedValueOnce(data(2)).mockResolvedValueOnce(data());
  renderUi(<MemoryRouter><UnitTable project={project} /></MemoryRouter>);
  await screen.findByRole("link", { name: "Unit A-1" });
  fireEvent.click(screen.getByRole("button", { name: "Next units" }));
  fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
  await screen.findByRole("link", { name: "Unit A-2" });
  expect(screen.getByRole("button", { name: "Next units" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Previous units" }));
  await screen.findByRole("link", { name: "Unit A-1" });
  expect(read.mock.calls.map(([args]) => args.query?.pageNumber)).toEqual([1, 2, 2, 1]);
});

test("empty units show a clear empty state", async () => {
  vi.spyOn(Units, "getUnitsByProject").mockResolvedValue({ ...data(), items: [], totalCount: 0, totalPages: 0 });
  renderUi(<MemoryRouter><UnitTable project={project} /></MemoryRouter>);
  expect(await screen.findByText("No units have been listed.")).toBeVisible();
  expect(screen.queryByRole("table")).toBeNull();
});

test("project change aborts its request and rejects late results", async () => {
  let resolve!: (value: PaginationResult<UnitListDto>) => void;
  const read = vi.spyOn(Units, "getUnitsByProject").mockReturnValueOnce(new Promise((yes) => { resolve = yes; })).mockResolvedValueOnce(data(2));
  const view = renderUi(<MemoryRouter><UnitTable project={project} /></MemoryRouter>);
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  view.rerender(<LocaleProvider instance={view.instance}><MemoryRouter><UnitTable project={{ ...project, id: "new-project" }} /></MemoryRouter></LocaleProvider>);
  await screen.findByRole("link", { name: "Unit A-2" });
  expect(read.mock.calls[0]![1]?.signal?.aborted).toBe(true);
  await act(async () => resolve(data()));
  expect(screen.queryByRole("link", { name: "Unit A-1" })).toBeNull();
});
