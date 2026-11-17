import { act, fireEvent, renderHook, screen, waitFor } from "@testing-library/react";
import { useCallback } from "react";
import { expect, test, vi } from "vitest";
import { Amenities } from "../../src/Components/Amenities";
import { MediaGallery } from "../../src/Components/MediaGallery";
import { AreaCatalogue } from "../../src/Features/Areas/Public/Browser";
import { ListContext as AreaListContext } from "../../src/Features/Areas/Public/ListContext";
import { readQuery as readAreaQuery, writeQuery as writeAreaQuery } from "../../src/Features/Areas/Public/query";
import { CityCatalogue } from "../../src/Features/Cities/Public/Browser";
import { ListContext as CityListContext } from "../../src/Features/Cities/Public/ListContext";
import { readQuery as readProjectQuery, writeQuery as writeProjectQuery } from "../../src/Features/Projects/Public/query";
import { useResourceRead } from "../../src/Hooks/useResourceRead";
import { createMediaResolver, resolveMedia } from "../../src/Media/delivery";
import { readListQuery } from "../../src/Router/listQuery";
import { renderUi } from "../renderUi";

const city = "00000000-0000-0000-0000-000000000001";
test("URL filters round-trip only approved values and numeric enums", () => {
  const query = readProjectQuery(
    new URLSearchParams(`search=hello&cityId=${city}&projectType=0&pageNumber=3&pageSize=24&sort=price&isAvailable=true`),
  );
  expect(query).toEqual({ search: "hello", cityId: city, projectType: 0, pageNumber: 3, pageSize: 24 });
  expect(readProjectQuery(writeProjectQuery(query))).toEqual(query);
  expect(writeProjectQuery(query).has("sort")).toBe(false);
  expect(readListQuery(new URLSearchParams("cityId=" + city + "&projectType=1&search=unit"))).toEqual({
    search: "unit",
    pageNumber: 1,
    pageSize: 12,
  });
});
test.each(["pageNumber=0&pageSize=101", "pageNumber=-2&pageSize=0", "pageNumber=Infinity&pageSize=NaN", "pageNumber=2147483648&pageSize=1.5"])(
  "invalid pagination is normalized: %s",
  (raw) => {
    expect(readProjectQuery(new URLSearchParams(raw))).toEqual({ pageNumber: 1, pageSize: 12 });
  },
);
test("invalid GUIDs/types are omitted and text respects the backend maximum", () => {
  expect(readProjectQuery(new URLSearchParams("cityId=bad&areaId=00000000-0000-0000-0000-000000000000&projectType=Initiative"))).toEqual({
    pageNumber: 1,
    pageSize: 12,
  });
  expect(readListQuery(new URLSearchParams("search=" + "x".repeat(101))).search).toHaveLength(100);
});

test("storage paths and origin-only configuration never become image URLs", () => {
  expect(resolveMedia("C:\\private\\image.png")).toBeUndefined();
  expect(resolveMedia("https://media.example.test/image.png")).toBeUndefined();
  expect(createMediaResolver()("uploads/a.png")).toBeUndefined();
});
test.each([
  "http://media.example.test/a.png",
  "https://evil.test/a.png",
  "https://media.example.test.evil.test/a.png",
  "https://user:password@media.example.test/a.png",
  "//media.example.test/a.png",
  "file:///a.png",
  "C:\\private\\a.png",
  "https://media.example.test/a.png#fragment",
])("rejects unapproved mapped image candidate: %s", (candidate) => {
  expect(createMediaResolver({ origin: "https://media.example.test", mapIdentifier: () => candidate })("storage-key")).toBeUndefined();
});
test("only an explicit mapping to the exact approved HTTPS origin is accepted", () => {
  const mapping = vi.fn((id: string) => (id === "known" ? "https://media.example.test/approved/a.webp" : undefined));
  const resolver = createMediaResolver({ origin: "https://media.example.test", mapIdentifier: mapping });
  expect(resolver("known")).toBe("https://media.example.test/approved/a.webp");
  expect(resolver("unknown")).toBeUndefined();
  expect(createMediaResolver({ origin: "http://media.example.test", mapIdentifier: mapping })("known")).toBeUndefined();
  expect(
    createMediaResolver({
      origin: "https://media.example.test",
      mapIdentifier: () => {
        throw new Error("private mapping failure");
      },
    })("known"),
  ).toBeUndefined();
});
test("gallery hides identifiers, localizes navigation and survives a broken approved image", () => {
  const resolver = createMediaResolver({ origin: "https://media.example.test", mapIdentifier: () => "https://media.example.test/a.png" });
  const { container } = renderUi(
    <MediaGallery
      images={[
        { id: "a", imagePath: "PRIVATE-DISK-IDENTIFIER", altText: "Supplied alt" },
        { id: "b", imagePath: "PRIVATE-SECOND", altText: null },
      ]}
      resolver={resolver}
    />,
  );
  expect(container.outerHTML).not.toContain("PRIVATE");
  fireEvent.error(screen.getByRole("img", { name: "Supplied alt" }));
  expect(screen.getByRole("img", { name: "Photo unavailable" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
  expect(screen.getByRole("img", { name: "Property photograph" })).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("Photo 2 of 2");
  expect(screen.getByRole("button", { name: "Next photo" })).toBeDisabled();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
test("out-of-order catalogue reads cannot replace current data, even when a loader ignores abort", async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  const signals: AbortSignal[] = [];
  const request = vi.fn((key: string, signal: AbortSignal) => {
    signals.push(signal);
    return key === "first" ? first.promise : second.promise;
  });
  const hook = renderHook(
    ({ id }) =>
      useResourceRead(
        id,
        useCallback((signal) => request(id, signal), [id]),
      ),
    { initialProps: { id: "first" } },
  );
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  hook.rerender({ id: "second" });
  expect(hook.result.current.result.status).toBe("loading");
  expect(signals[0]!.aborted).toBe(true);
  await act(async () => {
    second.resolve("current");
  });
  expect(hook.result.current.result).toEqual({ status: "success", data: "current" });
  await act(async () => {
    first.resolve("obsolete");
  });
  expect(hook.result.current.result).toEqual({ status: "success", data: "current" });
});
test("changing detail IDs hides previous content immediately; unmount aborts the pending read", async () => {
  const request = vi.fn<(signal: AbortSignal) => Promise<string>>().mockResolvedValue("initial");
  const hook = renderHook(({ id }) => useResourceRead(id, request), { initialProps: { id: "one" } });
  await waitFor(() => expect(hook.result.current.result.status).toBe("success"));
  request.mockImplementation(() => new Promise(() => {}));
  hook.rerender({ id: "two" });
  expect(hook.result.current.result.status).toBe("loading");
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  hook.unmount();
  expect(request.mock.calls[1]![0].aborted).toBe(true);
});
test("failure/retry discards old content and a disabled read never dispatches", async () => {
  const request = vi.fn<(signal: AbortSignal) => Promise<string>>().mockRejectedValueOnce(new Error("not for display")).mockResolvedValue("retried");
  const hook = renderHook(({ enabled }) => useResourceRead("same", request, enabled), { initialProps: { enabled: false } });
  expect(hook.result.current.result.status).toBe("idle");
  expect(request).not.toHaveBeenCalled();
  hook.rerender({ enabled: true });
  await waitFor(() => expect(hook.result.current.result.status).toBe("error"));
  act(() => hook.result.current.reload());
  expect(hook.result.current.result.status).toBe("loading");
  await waitFor(() => expect(hook.result.current.result).toEqual({ status: "success", data: "retried" }));
});

test("area URL filters round-trip only search and cityId, ignoring projectType and areaId", () => {
  const query = readAreaQuery(new URLSearchParams(`search=downtown&cityId=${city}&areaId=${city}&projectType=1&pageNumber=2&pageSize=24`));
  expect(query).toEqual({ search: "downtown", cityId: city, pageNumber: 2, pageSize: 24 });
  const written = writeAreaQuery(query);
  expect(written.has("projectType")).toBe(false);
  expect(written.has("areaId")).toBe(false);
  expect(written.get("cityId")).toBe(city);
  expect(written.get("search")).toBe("downtown");
  expect(written.get("pageNumber")).toBe("2");
  expect(written.get("pageSize")).toBe("24");
  expect(readAreaQuery(written)).toEqual(query);
});

test("AreaCatalogue renders sidebar layout with search and city location picker", () => {
  const { container } = renderUi(
    <AreaListContext value={{ params: { pageNumber: 1, pageSize: 12 }, result: { status: "idle" }, reload: vi.fn(), update: vi.fn() }}>
      <AreaCatalogue />
    </AreaListContext>,
  );
  expect(container.querySelector('section[aria-label="Search and filters"]')).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
  expect(screen.getByText("City")).toBeInTheDocument();
  expect(screen.queryByLabelText("Project type")).not.toBeInTheDocument();
});

test("CityCatalogue renders sidebar layout with search", () => {
  const { container } = renderUi(
    <CityListContext value={{ params: { pageNumber: 1, pageSize: 12 }, result: { status: "idle" }, reload: vi.fn(), update: vi.fn() }}>
      <CityCatalogue />
    </CityListContext>,
  );
  expect(container.querySelector('section[aria-label="Search and filters"]')).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
  expect(screen.queryByText("City")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Project type")).not.toBeInTheDocument();
});

test("Amenities renders card badges when cards=true", () => {
  const { container } = renderUi(<Amenities items={[{ name: "Gym", value: "Private access" }]} cards />);
  expect(container.querySelector("dl.flex.flex-wrap")).toBeInTheDocument();
  expect(screen.getByText("Gym")).toBeInTheDocument();
  expect(screen.getByText("Private access")).toBeInTheDocument();
});
