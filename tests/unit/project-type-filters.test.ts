import { expect, test } from "vitest";
import { activeProjectFilters, queryForType, typeFilterKey, type TypeFilterMemory } from "../../src/Features/Projects/Public/typeFilters";
import { writeQuery } from "../../src/Features/Projects/Public/query";

test("a new project type starts with independent filters and paging", () => {
  const memory: TypeFilterMemory = { "1": { search: "Garden", cityId: "city", projectType: 1, pageNumber: 3, pageSize: 24 } };
  expect(queryForType(0, memory)).toEqual({ projectType: 0, pageNumber: 1, pageSize: 12 });
  expect(queryForType(null, memory)).toEqual({ projectType: null, pageNumber: 1, pageSize: 12 });
});

test("restoring a type copies its own committed state without modifying the other collection", () => {
  const memory: TypeFilterMemory = {
    "0": { search: "Terrace", areaId: "area", projectType: 0, pageNumber: 2, pageSize: 3 },
    "1": { search: "Garden", projectType: 1, pageNumber: 1, pageSize: 24 },
  };
  const restored = queryForType(0, memory);
  expect(restored).toEqual(memory["0"]);
  restored.search = "Changed";
  expect(memory["0"]?.search).toBe("Terrace");
  expect(memory["1"]?.search).toBe("Garden");
  expect(typeFilterKey(0)).not.toBe(typeFilterKey(undefined));
});

test("active counts exclude collection selection and pagination, and All preserves unfiltered URLs", () => {
  expect(activeProjectFilters({ search: " ", projectType: 1, pageNumber: 4, pageSize: 48 })).toBe(0);
  expect(activeProjectFilters({ search: "Garden", cityId: "city", areaId: "area", pageNumber: 1, pageSize: 12 })).toBe(3);
  expect(writeQuery(queryForType(null, {})).toString()).toBe("");
});
