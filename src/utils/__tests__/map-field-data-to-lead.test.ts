import { describe, expect, it } from 'vitest';

import { mapFieldDataToLead } from 'src/utils/map-field-data-to-lead';

describe('mapFieldDataToLead', () => {
  it('maps standard Meta keys and keeps custom answers', () => {
    expect(
      mapFieldDataToLead([
        { name: 'full_name', values: ['Jane Example'] },
        { name: 'email', values: [' Jane@Example.COM '] },
        { name: 'phone_number', values: ['+48600100200'] },
        { name: 'city', values: ['Poznan'] },
        { name: 'company_name', values: ['Acme'] },
        { name: 'job_title', values: ['CTO'] },
        { name: 'budget_question', values: ['10k-50k'] },
      ]),
    ).toEqual({
      firstName: 'Jane',
      lastName: 'Example',
      email: 'jane@example.com',
      phone: '+48600100200',
      city: 'Poznan',
      companyName: 'Acme',
      jobTitle: 'CTO',
      customAnswers: { budget_question: '10k-50k' },
    });
  });

  it('prefers first_name and last_name over full_name', () => {
    const lead = mapFieldDataToLead([
      { name: 'full_name', values: ['Ignored Name'] },
      { name: 'first_name', values: ['Anna'] },
      { name: 'last_name', values: ['Maria Nowak'] },
    ]);

    expect([lead.firstName, lead.lastName]).toEqual(['Anna', 'Maria Nowak']);
  });

  it('splits full_name on the first space', () => {
    const lead = mapFieldDataToLead([
      { name: 'full_name', values: ['  Jan  Maria Kowalski '] },
    ]);

    expect([lead.firstName, lead.lastName]).toEqual(['Jan', 'Maria Kowalski']);
  });

  it('keeps a single-word full_name as first name', () => {
    const lead = mapFieldDataToLead([{ name: 'full_name', values: ['Cher'] }]);

    expect([lead.firstName, lead.lastName]).toEqual(['Cher', '']);
  });

  it('joins multi-value custom answers', () => {
    const lead = mapFieldDataToLead([
      { name: 'services', values: ['SEO', 'Ads'] },
    ]);

    expect(lead.customAnswers).toEqual({ services: 'SEO, Ads' });
  });

  it('returns an empty lead for empty field data', () => {
    expect(mapFieldDataToLead([])).toEqual({
      firstName: '',
      lastName: '',
      customAnswers: {},
    });
  });
});
