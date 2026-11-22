import { apiRequest } from "../../API";
import { apiPaths } from "../../Router/routePaths";
import { submitContactSubmission } from "../../Services/ContactSubmissions";
import type { ContactSubmissionInput } from "../../Types/contracts";

const defaultRegistration = apiPaths.ContactSubmissions.submitContactSubmission;
export const registrationPath: string = (import.meta.env.VITE_HOME_REGISTRATION_PATH ?? defaultRegistration).trim();
export const surveyPath: string = (import.meta.env.VITE_HOME_SURVEY_PATH ?? "").trim();

export interface SurveyResponse {
  priority: string;
  clarity: string;
  suggestion: string;
}

export function sendRegistration(body: ContactSubmissionInput, signal: AbortSignal) {
  return registrationPath === defaultRegistration ? submitContactSubmission({ body }, { signal }) : send(registrationPath, body, signal);
}

function send(path: string, body: ContactSubmissionInput | SurveyResponse, signal: AbortSignal) {
  return apiRequest<unknown>({
    method: "POST",
    path,
    body,
    signal,
    metadata: { operation: "SubmitHomepageForm", authenticated: false, skipAuthenticationRecovery: true },
  });
}

export function sendSurvey(body: SurveyResponse, signal: AbortSignal) {
  return send(surveyPath, body, signal);
}
