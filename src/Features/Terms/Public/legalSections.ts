export interface LegalSection {
  id: string;
  heading: string | null;
  /** An exact slice of the API text, including its original line endings. */
  content: string;
}

/** Index explicit plain-text headings; never infer legal clauses from ordinary paragraphs. */
export function indexLegalSections(content: string): LegalSection[] {
  if (!content.trim()) return [];
  const headings: { start: number; text: string }[] = [];
  const lines = content.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g);
  for (const line of lines) {
    const text = line[0].replace(/[\r\n]+$/, "");
    if (text.length > 160) continue;
    const explicit = /^(?:#{1,3}\s+\S|(?:article|clause|section)\s+(?:\d+|[IVXLCDM]+)\b|(?:المادة|البند|الفصل)\s+\S)/i.test(text);
    // A short numbered heading must stand apart from the surrounding paragraphs.
    const numbered = /^[0-9٠-٩]+[.)]\s+\S/.test(text) && text.length <= 100
      && (line.index === 0 || /(?:\r?\n){2}$/.test(content.slice(0, line.index)))
      && /^(?:\r?\n)/.test(content.slice(line.index + line[0].length));
    if (explicit || numbered) headings.push({ start: line.index, text });
  }
  const starts = headings[0]?.start === 0 ? headings : [{ start: 0, text: "" }, ...headings];
  return starts.map((item, index) => ({
    id: `legal-section-${index + 1}`,
    heading: item.text || null,
    content: content.slice(item.start, starts[index + 1]?.start ?? content.length),
  }));
}
