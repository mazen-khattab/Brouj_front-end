export function validEmail(value: string) {
  const text = value.trim();
  const at = text.indexOf("@");
  // InputRules.Email delegates to .NET 10 EmailAddressAttribute, not an RFC mailbox regex.
  return text.length <= 254 && !/[\r\n]/.test(text) && at > 0 && at < text.length - 1 && at === text.lastIndexOf("@");
}
