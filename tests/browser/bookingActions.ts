import type { Page } from '@playwright/test';

export const bookingDetails = {
  fullName: 'Fixture Second Third Customer', phone: '01000000000', identityNumber: '10000000000000',
  ageGroup: '28-35', placeOfResidence: 'Cairo', preferredFinancialBracket: 500000, preferredRepaymentPeriod: 9,
};

export async function fillBooking(page: Page) {
  await page.locator('#booking-fullName').fill(bookingDetails.fullName);
  await page.locator('#booking-phone').fill(bookingDetails.phone);
  await page.locator('#booking-identityNumber').fill(bookingDetails.identityNumber);
  await page.locator('#booking-ageGroup').selectOption(bookingDetails.ageGroup);
  await page.locator('#booking-placeOfResidence').fill(bookingDetails.placeOfResidence);
  await page.locator('#booking-preferredFinancialBracket').selectOption(String(bookingDetails.preferredFinancialBracket));
  await page.locator('#booking-preferredRepaymentPeriod').selectOption(String(bookingDetails.preferredRepaymentPeriod));
}
