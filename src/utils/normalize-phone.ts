import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

export type NormalizedPhone = {
  e164: string;
  callingCode: string;
  nationalNumber: string;
  countryCode?: string;
};

export const normalizePhone = (
  raw: string,
  defaultCountry?: CountryCode,
): NormalizedPhone | undefined => {
  const parsed = parsePhoneNumberFromString(raw.trim(), defaultCountry);

  if (!parsed || !parsed.isPossible()) {
    return undefined;
  }

  return {
    e164: parsed.number,
    callingCode: `+${parsed.countryCallingCode}`,
    nationalNumber: parsed.nationalNumber,
    countryCode: parsed.country,
  };
};
