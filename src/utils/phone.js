export const normalizePhone = (value) => (value || '').replace(/\D/g, '');

export const maskPhone = (value) => {
  const digits = normalizePhone(value);
  if (!digits) return '****';
  const last4 = digits.slice(-4);
  const masked = digits.length > 4 ? `${'*'.repeat(digits.length - 4)}${last4}` : last4.padStart(4, '*');
  return `+91 ${masked}`;
};
