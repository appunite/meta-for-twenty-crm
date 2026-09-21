import { normalizePhone } from 'src/utils/normalize-phone';

export const toPhonesInput = (rawPhone: string) => {
  const phone = normalizePhone(rawPhone);

  return phone
    ? {
        primaryPhoneNumber: phone.nationalNumber,
        primaryPhoneCallingCode: phone.callingCode,
        primaryPhoneCountryCode: phone.countryCode,
      }
    : undefined;
};
