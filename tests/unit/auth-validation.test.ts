import { expect, test } from 'vitest';
import { emptyAuthValues, validateAuth } from '../../src/Pages/Auth/validation';

const valid = { ...emptyAuthValues, fName: 'Customer', lName: 'Fixture', phone: '01000000000', identityNumber: '10000000000000', email: 'customer@example.test', password: 'test-password' };
test('login accepts existing one-character passwords while registration requires eight', () => {
  expect(validateAuth('customer', { ...valid, password: 'x' })).toEqual([]);
  expect(validateAuth('staff', { ...valid, password: 'x' })).toEqual([]);
  expect(validateAuth('register', { ...valid, password: '1234567' })).toContainEqual({ field: 'password', key: 'validation.password' });
  expect(validateAuth('register', { ...valid, password: '12345678' })).toEqual([]);
});
test('registration matches name length and ASCII Egyptian phone/national ID rules', () => {
  expect(validateAuth('register', { ...valid, fName: 'x'.repeat(100) })).toEqual([]);
  expect(validateAuth('register', { ...valid, fName: 'x'.repeat(101) })).toContainEqual({ field: 'fName', key: 'validation.nameLength' });
  for (const phone of ['01200000000', '01100000000', '01500000000']) expect(validateAuth('register', { ...valid, phone })).toEqual([]);
  for (const phone of ['01300000000', '0100000000', '٠١٠٠٠٠٠٠٠٠٠']) expect(validateAuth('register', { ...valid, phone })).toContainEqual({ field: 'phone', key: 'validation.phone' });
  for (const identityNumber of ['1000000000000', '100000000000000', '١٠٠٠٠٠٠٠٠٠٠٠٠٠']) expect(validateAuth('register', { ...valid, identityNumber })).toContainEqual({ field: 'identityNumber', key: 'validation.identityNumber' });
});
test('email mirrors trimmed .NET EmailAddressAttribute without inventing stronger mailbox rules', () => {
  for (const email of [' user@host ', 'first last@example.test', 'x'.repeat(252) + '@x']) expect(validateAuth('customer', { ...valid, email })).toEqual([]);
  for (const email of ['missing', '@host', 'user@', 'user@@host', 'x'.repeat(253) + '@x', 'user\nname@host']) expect(validateAuth('customer', { ...valid, email })).toContainEqual({ field: 'email', key: 'validation.email' });
});
test('all registration fields are required; registration-only data does not affect login', () => {
  expect(validateAuth('register', emptyAuthValues)).toHaveLength(6);
  expect(validateAuth('customer', { ...emptyAuthValues, email: 'customer@example.test', password: 'x' })).toEqual([]);
});
