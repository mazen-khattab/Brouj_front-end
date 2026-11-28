import type { CreateTermsVersionInput } from "../../../Types/contracts";
import { toDateTimeOffsetIso } from "../../../utils/dateTimeOffset";
import type { TermsValues } from "./types";
export function validateTerms(values: TermsValues) {
  return [
    ...(!values.title.trim() || values.title.length > 300 ? ["title"] : []),
    ...(!values.content.trim() || values.content.length > 100000 ? ["content"] : []),
    ...(!values.versionNumber.trim() || values.versionNumber.trim().length > 32 ? ["versionNumber"] : []),
    ...(!toDateTimeOffsetIso(values.effectiveDate) ? ["effectiveDate"] : []),
  ];
}
export function termsInput(values: TermsValues): CreateTermsVersionInput {
  const effectiveDate = toDateTimeOffsetIso(values.effectiveDate);
  if (!effectiveDate) throw new Error("A valid effective date is required.");
  return { title: values.title, content: values.content, versionNumber: values.versionNumber, effectiveDate };
}
