import { expect, test } from 'vitest';
import { validateLogin } from "../../src/Features/Authentication/Customer/loginValidation";
import { validateLogin as validateStaffLogin } from "../../src/Features/Authentication/Staff/loginValidation";
import { validateRegistration } from "../../src/Features/Authentication/Customer/registrationValidation";
const emptyAuthValues = { email: "", password: "", fName: "", lName: "", phone: "", identityNumber: "" };

const valid = { ...emptyAuthValues, fName: 'Customer', lName: 'Fixture', phone: '01000000000', identityNumber: '10000000000000', email: 'customer@example.test', password: 'test-password' };
test('login accepts existing one-character passwords while registration requires eight', () => {
  expect(validateLogin({ ...valid, password: 'x' })).toEqual([]);
  expect(validateStaffLogin({ ...valid, password: 'x' })).toEqual([]);
  expect(validateRegistration({ ...valid, password: '1234567' })).toContainEqual({ field: 'password', key: 'validation.password' });
  expect(validateRegistration({ ...valid, password: '12345678' })).toEqual([]);
});
test('registration matches name length and ASCII Egyptian phone/national ID rules', () => {
  expect(validateRegistration({ ...valid, fName: 'x'.repeat(100) })).toEqual([]);
  expect(validateRegistration({ ...valid, fName: 'x'.repeat(101) })).toContainEqual({ field: 'fName', key: 'validation.nameLength' });
  for (const phone of ['01200000000', '01100000000', '01500000000']) expect(validateRegistration({ ...valid, phone })).toEqual([]);
  for (const phone of ['01300000000', '0100000000', '٠١٠٠٠٠٠٠٠٠٠']) expect(validateRegistration({ ...valid, phone })).toContainEqual({ field: 'phone', key: 'validation.phone' });
  for (const identityNumber of ['1000000000000', '100000000000000', '١٠٠٠٠٠٠٠٠٠٠٠٠٠']) expect(validateRegistration({ ...valid, identityNumber })).toContainEqual({ field: 'identityNumber', key: 'validation.identityNumber' });
});
test('email mirrors trimmed .NET EmailAddressAttribute without inventing stronger mailbox rules', () => {
  for (const email of [' user@host ', 'first last@example.test', 'x'.repeat(252) + '@x']) expect(validateLogin({ ...valid, email })).toEqual([]);
  for (const email of ['missing', '@host', 'user@', 'user@@host', 'x'.repeat(253) + '@x', 'user\nname@host']) expect(validateLogin({ ...valid, email })).toContainEqual({ field: 'email', key: 'validation.email' });
});
test('all registration fields are required; registration-only data does not affect login', () => {
  expect(validateRegistration(emptyAuthValues)).toHaveLength(6);
  expect(validateLogin({ ...emptyAuthValues, email: 'customer@example.test', password: 'x' })).toEqual([]);
});
