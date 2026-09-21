import { describe, expect, it } from 'vitest';

import { normalizePhone } from 'src/utils/normalize-phone';

const POLISH_MOBILE = {
  e164: '+48600100299',
  callingCode: '+48',
  nationalNumber: '600100299',
  countryCode: 'PL',
};

describe('normalizePhone', () => {
  it('splits an international number', () => {
    expect(normalizePhone('+48600100299')).toEqual(POLISH_MOBILE);
  });

  it('ignores formatting characters', () => {
    expect(normalizePhone(' +48 600-100-299 ')).toEqual(POLISH_MOBILE);
  });

  it('uses the default country for a national number', () => {
    expect(normalizePhone('600 100 299', 'PL')).toEqual(POLISH_MOBILE);
  });

  it('detects the country from the calling code', () => {
    expect(normalizePhone('+44 20 7946 0958')).toEqual({
      e164: '+442079460958',
      callingCode: '+44',
      nationalNumber: '2079460958',
      countryCode: 'GB',
    });
  });

  it('returns undefined for a national number without a default country', () => {
    expect(normalizePhone('600100299')).toBeUndefined();
  });

  it('returns undefined for text that is not a phone number', () => {
    expect(normalizePhone('call me maybe')).toBeUndefined();
    expect(normalizePhone('')).toBeUndefined();
  });
});
