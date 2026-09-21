import { describe, expect, it } from 'vitest';

import { toPhonesInput } from 'src/utils/to-phones-input';

describe('toPhonesInput', () => {
  it('splits a valid phone into Twenty phone fields', () => {
    expect(toPhonesInput('+48600100200')).toEqual({
      primaryPhoneNumber: '600100200',
      primaryPhoneCallingCode: '+48',
      primaryPhoneCountryCode: 'PL',
    });
  });

  it('returns undefined for a value that is not a phone number', () => {
    expect(toPhonesInput('<test lead: dummy data for phone_number>')).toBeUndefined();
  });
});
