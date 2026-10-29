import { act, renderHook, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import {
  areaInput,
  cityInput,
  draftFrom,
  fileIssue,
  invalidFields,
  projectInput,
  unitInput,
  unitTotalFits,
  validAmenities,
} from "../../src/AdminCatalogue/model";
import type { ProjectDto } from "../../src/Types/contracts";
import { AuthContext } from "../../src/Context/AuthContext";
import type { AuthValue } from "../../src/Context/AuthContext";
import { AdminCatalogueProvider } from "../../src/Context/AdminCatalogueProvider";
import { useAdminCatalogue } from "../../src/Context/AdminCatalogueContext";
import type { AdminCatalogueValue } from "../../src/Context/AdminCatalogueContext";
import { sessionBoundary } from "../../src/Security/sessionBoundary";
import { ApiError } from "../../src/Types/failures";
import { useAdminRecord } from "../../src/Hooks/useAdminRecord";
import * as cities from "../../src/Services/Cities";
import { renderUi } from "../renderUi";

const id = "10000000-0000-4000-8000-000000000001";
const auth: AuthValue = {
  status: "staff",
  actor: "staff",
  profile: { id, name: "Staff", email: "staff@example.test", phone: "01000000000", role: 1, deletedAt: null },
  role: 1,
  generation: 1,
  pending: false,
  automaticRefresh: true,
  logoutRequired: true,
  loginCustomer: vi.fn(),
  loginStaff: vi.fn(),
  registerCustomer: vi.fn(),
  logout: vi.fn(),
  retryBootstrap: vi.fn(),
  reloadIdentity: vi.fn(),
};
const project: ProjectDto = {
  id,
  name: "Fixture",
  areaId: id,
  description: null,
  latitude: null,
  longitude: null,
  size: 100,
  projectType: 0,
  price: 0,
  floorCount: 0,
  plannedUnitCount: 0,
  neighborPrice: null,
  drawDate: null,
  amenities: [],
  images: [],
  isGarage: true,
  garagePrice: 0,
};

function mount() {
  let value!: AdminCatalogueValue;
  function Probe() {
    value = useAdminCatalogue();
    return null;
  }
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <AdminCatalogueProvider scope="staff:1">
          <Probe />
        </AdminCatalogueProvider>
      ),
    },
  ]);
  const view = renderUi(
    <AuthContext value={auth}>
      <RouterProvider router={router} />
    </AuthContext>,
  );
  return {
    ...view,
    router,
    get value() {
      return value;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("same-editor paging retains dirty state while switching to a create mode still requires confirmation", async () => {
  // jsdom has no native dialog lifecycle; real modal behavior is covered in Playwright.
  const prototype = HTMLDialogElement.prototype;
  const show = Object.getOwnPropertyDescriptor(prototype, "showModal");
  const close = Object.getOwnPropertyDescriptor(prototype, "close");
  Object.defineProperties(prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = true;
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = false;
      },
    },
  });
  const view = mount();
  try {
    act(() => view.value.markDirty("record", true));
    await act(async () => {
      await view.router.navigate("/?unitPage=2");
    });
    expect(view.router.state.location.search).toBe("?unitPage=2");
    await act(async () => {
      await view.router.navigate("/?create=1");
    });
    expect(view.router.state.location.search).toBe("?unitPage=2");
    expect([...view.router.state.blockers.values()].some((blocker) => blocker.state === "blocked")).toBe(true);
  } finally {
    view.unmount();
    if (show) {
      Object.defineProperty(prototype, "showModal", show);
    } else {
      Reflect.deleteProperty(prototype, "showModal");
    }
    if (close) {
      Object.defineProperty(prototype, "close", close);
    } else {
      Reflect.deleteProperty(prototype, "close");
    }
  }
});

test("full project PATCH input strips identity, images, amenities and server-controlled garage fields", () => {
  expect(projectInput(draftFrom("project", project))).toEqual({
    name: "Fixture",
    areaId: id,
    description: null,
    latitude: null,
    longitude: null,
    size: 100,
    projectType: 0,
    price: 0,
    floorCount: 0,
    plannedUnitCount: 0,
    neighborPrice: null,
    drawDate: null,
  });
  expect(cityInput({ name: "City", id, deletedAt: "extra" })).toEqual({ name: "City" });
  expect(areaInput({ name: "Area", cityId: id, cityName: "Read only" })).toEqual({ name: "Area", cityId: id });
  expect(unitInput({ number: "A", size: "20", floorNumber: "0", meterPrice: "5", neighborMeterPrice: "", isAvailable: "false" })).toEqual({
    number: "A",
    size: 20,
    floorNumber: 0,
    meterPrice: 5,
    neighborMeterPrice: null,
  });
});

test("project validators distinguish initiative-only fields, coordinate ranges and decimal precision", () => {
  const valid = draftFrom("project", project);
  expect(invalidFields("project", valid)).toEqual([]);
  expect(invalidFields("project", { ...valid, projectType: "1" })).toEqual(expect.arrayContaining(["price", "neighborPrice", "drawDate"]));
  expect(
    invalidFields("project", {
      ...valid,
      latitude: "91",
      longitude: "-181",
      size: "0",
      price: "1.00001",
      floorCount: "-1",
      plannedUnitCount: "1.5",
      neighborPrice: "10",
      drawDate: "invalid",
    }),
  ).toEqual(expect.arrayContaining(["latitude", "longitude", "size", "price", "floorCount", "plannedUnitCount", "neighborPrice", "drawDate"]));
  expect(invalidFields("project", { ...valid, projectType: "1", price: "1", neighborPrice: "0", drawDate: "2026-12-01T12:00:00+02:00" })).toEqual([]);
  expect(invalidFields("area", { name: "Area", cityId: "free-form-id" })).toContain("cityId");
  expect(invalidFields("project", { ...valid, projectType: "1", price: "1", neighborPrice: "0", drawDate: "2026-02-31T12:00:00Z" })).toContain(
    "drawDate",
  );
});

test("unit monetary overflow and scale are checked without float rounding at the limit", () => {
  expect(unitTotalFits("1", "999999999999999.9900")).toBe(true);
  expect(unitTotalFits("1", "999999999999999.9901")).toBe(false);
  expect(unitTotalFits("100", "1.0001")).toBe(true);
  expect(unitTotalFits("1", "1.00001")).toBe(false);
  expect(invalidFields("unit", { number: "N", floorNumber: "0", meterPrice: "0", size: "0.0001", neighborMeterPrice: "" })).toEqual([]);
});

test("amenities allow empty replacement, bound collection size, and require Name/Value pairs", () => {
  expect(validAmenities([])).toBe(true);
  expect(validAmenities([{ name: "x".repeat(100), value: "y".repeat(32) }])).toBe(true);
  expect(validAmenities([{ name: " ", value: "yes" }])).toBe(false);
  expect(validAmenities([{ name: "Valid", value: "x".repeat(33) }])).toBe(false);
  expect(validAmenities(Array.from({ length: 101 }, () => ({ name: "Name", value: "Value" })))).toBe(false);
});

test.each([
  ["photo.jpg", "image/jpeg"],
  ["photo.JPEG", "image/jpeg"],
  ["photo.png", "image/png"],
  ["photo.webp", "image/webp"],
])("storage format %s is allowed with its matching MIME", (name, type) => {
  expect(fileIssue(new File(["image"], name, { type }))).toBeUndefined();
});

test("file metadata rejects empty/oversize files, mismatches, active formats and traversal", () => {
  expect(fileIssue(new File([], "empty.png", { type: "image/png" }))).toBe("fileSize");
  expect(fileIssue(new File([new Uint8Array(5 * 1024 * 1024)], "limit.png", { type: "image/png" }))).toBeUndefined();
  expect(fileIssue(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }))).toBe("fileSize");
  for (const [name, type] of [
    ["x.png", "image/jpeg"],
    ["x.svg", "image/svg+xml"],
    ["../x.png", "image/png"],
    ["x\u0001.png", "image/png"],
  ]) {
    expect(fileIssue(new File(["x"], name!, { type: type! }))).toBe("fileType");
  }
});

test("synchronous duplicate writes are rejected and the lock covers authoritative refresh", async () => {
  const view = mount();
  let release!: (value: string) => void;
  let readRelease!: () => void;
  const work = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        release = resolve;
      }),
  );
  const refresh = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        readRelease = resolve;
      }),
  );
  let first!: Promise<unknown>;
  await act(async () => {
    first = view.value.run(work, refresh);
    await view.value.run(work, refresh);
  });
  expect(work).toHaveBeenCalledTimes(1);
  await act(async () => {
    release(id);
    await Promise.resolve();
  });
  expect(view.value.pending).toBe(true);
  await act(async () => {
    await view.value.run(work, refresh);
    readRelease();
    await first;
  });
  expect(work).toHaveBeenCalledTimes(1);
  expect(view.value.succeeded).toBe(true);
});

test("409 refreshes current data, keeps the write recoverable and never replays it", async () => {
  const view = mount();
  const work = vi.fn().mockRejectedValue(new ApiError("transport", { status: 409 }));
  const refresh = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    await view.value.run(work, refresh);
  });
  expect(work).toHaveBeenCalledTimes(1);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(view.value.failure?.status).toBe(409);
  expect(view.value.blocked).toBe(false);
});

test.each([413, 415, 429])("a definitive %s failure preserves a manually retryable action without automatic replay", async (status) => {
  const view = mount();
  const work = vi.fn().mockRejectedValue(new ApiError("transport", { status }));
  const refresh = vi.fn();
  await act(async () => {
    await view.value.run(work, refresh);
  });
  expect(work).toHaveBeenCalledTimes(1);
  expect(refresh).not.toHaveBeenCalled();
  expect(view.value.uncertain).toBe(false);
});

test("unknown outcomes and failed follow-up reads block writes until an explicit successful check", async () => {
  const view = mount();
  const work = vi.fn().mockResolvedValue(id);
  const refresh = vi.fn().mockRejectedValue(new ApiError("network"));
  await act(async () => {
    await view.value.run(work, refresh);
  });
  expect(view.value.blocked).toBe(true);
  expect(view.value.uncertain).toBe(true);
  await act(async () => {
    await view.value.run(work, refresh);
    await view.value.check(refresh);
  });
  expect(work).toHaveBeenCalledTimes(1);
  expect(view.value.blocked).toBe(true);
  refresh.mockResolvedValue(undefined);
  await act(async () => {
    await view.value.check(refresh);
  });
  expect(view.value.blocked).toBe(false);
});

test("malformed success references remain uncertain and do not initiate a read", async () => {
  const view = mount();
  const refresh = vi.fn();
  await act(async () => {
    await view.value.run(async () => "not-an-id", refresh);
  });
  expect(refresh).not.toHaveBeenCalled();
  expect(view.value.uncertain).toBe(true);
});

test("actor-generation changes and unmount aborts prevent late success/refresh", async () => {
  const view = mount();
  let finish!: (id: string) => void;
  let signal!: AbortSignal;
  const work = vi.fn((request: AbortSignal) => {
    signal = request;
    return new Promise<string>((resolve) => {
      finish = resolve;
    });
  });
  const refresh = vi.fn();
  let pending!: Promise<unknown>;
  act(() => {
    pending = view.value.run(work, refresh);
  });
  view.unmount();
  expect(signal.aborted).toBe(true);
  finish(id);
  expect(await pending).toBeUndefined();
  expect(refresh).not.toHaveBeenCalled();
  const stale = mount();
  vi.spyOn(sessionBoundary, "stamp").mockReturnValue({ generation: 2, revision: 0 });
  await act(async () => {
    await stale.value.run(work, refresh);
  });
  expect(work).toHaveBeenCalledTimes(1);
});

test("record refresh retains an editable snapshot during outages and aborts on unmount", async () => {
  const get = vi.spyOn(cities, "getCityById").mockResolvedValue({ id, name: "Initial" });
  const view = renderHook(() => useAdminRecord("city", id, "", 1));
  await waitFor(() => expect(view.result.current.data).toEqual({ id, name: "Initial" }));
  get.mockRejectedValue(new ApiError("network"));
  await act(async () => {
    await expect(view.result.current.reload()).rejects.toBeInstanceOf(ApiError);
  });
  expect(view.result.current.data).toEqual({ id, name: "Initial" });
  expect(view.result.current.failure?.kind).toBe("network");
  let finish!: (value: { id: string; name: string }) => void;
  get.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let pending!: Promise<unknown>;
  act(() => {
    pending = view.result.current.reload();
  });
  const signal = get.mock.calls.at(-1)![1]!.signal!;
  view.unmount();
  expect(signal.aborted).toBe(true);
  finish({ id, name: "Late" });
  await expect(pending).rejects.toMatchObject({ kind: "canceled" });
});
