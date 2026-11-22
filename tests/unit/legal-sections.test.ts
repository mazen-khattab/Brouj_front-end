import { expect, test } from "vitest";
import { indexLegalSections } from "../../src/Features/Terms/Public/legalSections";

test("indexes explicit bilingual headings while preserving every source character and line ending", () => {
  const content = "Opening text.\r\n\r\nArticle 1: Participation\r\nOriginal wording.\r\n\r\nالمادة الثانية: الوثائق\r\nالنص الأصلي.\r\n";
  const sections = indexLegalSections(content);
  expect(sections.map(section => section.heading)).toEqual([null, "Article 1: Participation", "المادة الثانية: الوثائق"]);
  expect(sections.map(section => section.content).join("")).toBe(content);
  expect(new Set(sections.map(section => section.id)).size).toBe(3);
});

test("unstructured paragraphs and literal markup stay a single complete section", () => {
  const content = "Published prose.\n\nAnother paragraph.\n<b>This stays plain text.</b>\n<script>neverExecute()</script>";
  expect(indexLegalSections(content)).toEqual([{ id: "legal-section-1", heading: null, content }]);
});

test("only standalone numbered headings become index entries, not ordinary list items", () => {
  const content = "1. First heading\n\nParagraph.\n1. Ordinary list item\n2. Another list item\n\n2. Second heading\n\nParagraph.";
  const sections = indexLegalSections(content);
  expect(sections.map(section => section.heading)).toEqual(["1. First heading", "2. Second heading"]);
  expect(sections.map(section => section.content).join("")).toBe(content);
});

test("heading markers are preserved and whitespace-only publications have no clauses", () => {
  expect(indexLegalSections("## An authored heading\nParagraph.")[0]?.heading).toBe("## An authored heading");
  expect(indexLegalSections(" \r\n\t ")).toEqual([]);
});
