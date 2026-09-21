import { describe, expect, it } from 'vitest';

import { parseLeadgenWebhook } from 'src/utils/parse-leadgen-webhook';

describe('parseLeadgenWebhook', () => {
  it('extracts a leadgen change from a page webhook', () => {
    const body = {
      object: 'page',
      entry: [
        {
          id: '111111111111',
          time: 1757846400,
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: '444444444444',
                page_id: '111111111111',
                form_id: '222222222222',
                adgroup_id: '333333333333',
                ad_id: '333333333333',
                created_time: 1757846399,
              },
            },
          ],
        },
      ],
    };

    expect(parseLeadgenWebhook(body)).toEqual([
      {
        leadgenId: '444444444444',
        pageId: '111111111111',
        formId: '222222222222',
        adId: '333333333333',
        createdTime: 1757846399,
      },
    ]);
  });

  it('flattens several entries and skips non-leadgen changes', () => {
    const body = {
      object: 'page',
      entry: [
        {
          id: '1',
          changes: [
            { field: 'feed', value: { item: 'status' } },
            {
              field: 'leadgen',
              value: {
                leadgen_id: 'L1',
                page_id: '1',
                form_id: 'F1',
                created_time: 10,
              },
            },
          ],
        },
        {
          id: '2',
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: 'L2',
                page_id: '2',
                form_id: 'F2',
                created_time: 20,
              },
            },
          ],
        },
      ],
    };

    expect(parseLeadgenWebhook(body).map((event) => event.leadgenId)).toEqual([
      'L1',
      'L2',
    ]);
  });

  it.each([
    ['null', null],
    ['a string', 'hello'],
    ['a body without entry', { object: 'page' }],
    ['an entry without changes', { object: 'page', entry: [{ id: '1' }] }],
    [
      'a leadgen change without leadgen_id',
      { object: 'page', entry: [{ changes: [{ field: 'leadgen', value: {} }] }] },
    ],
  ])('returns no events for %s', (_label, body) => {
    expect(parseLeadgenWebhook(body)).toEqual([]);
  });
});
