import type { CreateTermsVersionInput } from "../../../Types/contracts";
import { validDateTime } from "../../../Validation/dateTime";
import type { TermsValues } from "./types";
export function validateTerms(values: TermsValues) {
  return [
    ...(!values.title.trim() || values.title.length > 300 ? ["title"] : []),
    ...(!values.content.trim() || values.content.length > 100000 ? ["content"] : []),
    ...(!values.versionNumber.trim() || values.versionNumber.trim().length > 32 ? ["versionNumber"] : []),
    ...(!validDateTime(values.effectiveDate) ? ["effectiveDate"] : []),
  ];
}
export function termsInput(values: TermsValues): CreateTermsVersionInput {
  return { title: values.title, content: values.content, versionNumber: values.versionNumber, effectiveDate: values.effectiveDate };
}
