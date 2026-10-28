import { expect, test } from 'vitest';
import { FeatureErrorCode } from '../../src/Types/contracts';
import { ApiError, failureFromResponse } from '../../src/Types/failures';
import { apiFailureMessage } from '../../src/i18n/apiFailures';
import { createLocaleInstance } from '../../src/i18n/instance';

test.each(['ar', 'en'] as const)('all known error codes have local %s text without raw server fallback', (locale) => {
  const instance = createLocaleInstance(locale);
  expect(apiFailureMessage(failureFromResponse(400, { success: false, code: 9999 })).key).toBe('generic');
  for (const code of Object.values(FeatureErrorCode).filter((value) => value !== FeatureErrorCode.None)) {
    const failure = failureFromResponse(400, { success: false, code, message: 'private stack' });
    const message = apiFailureMessage(failure);
    expect(instance.exists(message.key, { ns: message.namespace })).toBe(true);
    expect(instance.t(message.key, { ns: message.namespace })).not.toMatch(/private|stack|Content unavailable/);
  }
  for (const failure of [new ApiError('network'), new ApiError('canceled'), new ApiError('unknown'),
    failureFromResponse(400, { success: false, code: 9999, message: 'private' }),
    ...[401, 403, 404, 409, 413, 415, 429, 500].map((status) => failureFromResponse(status, null))]) {
    const message = apiFailureMessage(failure);
    expect(instance.exists(message.key, { ns: 'errors' })).toBe(true);
  }
});
