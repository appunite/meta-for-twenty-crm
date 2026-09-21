import { describe, expect, it } from 'vitest';

import { InMemoryFormRepository } from 'src/__tests__/utils/in-memory-form-repository';
import {
  type MetaGraphClient,
  type MetaLeadFormSummary,
} from 'src/meta-client/meta-graph-client';
import { syncPageForms } from 'src/utils/sync-page-forms';

const GRAPH_FORM: MetaLeadFormSummary = {
  id: 'F1',
  name: 'Autumn',
  status: 'ACTIVE',
  locale: 'pl_PL',
  questions: [
    { key: 'full_name', label: 'Full name', type: 'FULL_NAME', id: '1' },
    {
      key: 'what_is_your_budget?',
      label: 'What is your budget?',
      type: 'CUSTOM',
      id: '2',
    },
  ],
  headline: 'Tell us about your project',
  privacyPolicyUrl: 'https://example.com/privacy',
  followUpActionUrl: 'https://example.com/thanks',
  createdTime: '2026-09-15T12:40:29+0000',
  leadsCount: 2,
  organicLeadsCount: 1,
  expiredLeadsCount: 0,
};

describe('syncPageForms', () => {
  it('stores every form of the page with everything Meta returns', async () => {
    const forms = new InMemoryFormRepository();
    const requestedPages: string[] = [];
    const graph: Pick<MetaGraphClient, 'listPageForms'> = {
      listPageForms: async (pageId) => {
        requestedPages.push(pageId);

        return [
          GRAPH_FORM,
          { id: 'F2', name: 'Old', status: 'ARCHIVED', questions: [] },
        ];
      },
    };

    const count = await syncPageForms({
      pageId: ' 111 ',
      graph,
      formRepository: forms,
    });

    expect(requestedPages).toEqual(['111']);
    expect(count).toBe(2);
    expect(forms.forms.get('F1')).toEqual({
      formId: 'F1',
      pageId: '111',
      name: 'Autumn',
      formStatus: 'ACTIVE',
      locale: 'pl_PL',
      questions: GRAPH_FORM.questions,
      questionLabels: 'Full name, What is your budget?',
      headline: 'Tell us about your project',
      privacyPolicyUrl: 'https://example.com/privacy',
      followUpActionUrl: 'https://example.com/thanks',
      metaCreatedAt: '2026-09-15T12:40:29.000Z',
      leadsCount: 2,
      organicLeadsCount: 1,
      expiredLeadsCount: 0,
      isEnabled: true,
      lastSyncedAt: null,
    });
  });

  it('stores a form that has no optional fields', async () => {
    const forms = new InMemoryFormRepository();

    await syncPageForms({
      pageId: '111',
      graph: {
        listPageForms: async () => [
          { id: 'F2', name: 'Bare', status: 'DRAFT', questions: [] },
        ],
      },
      formRepository: forms,
    });

    expect(forms.forms.get('F2')).toEqual({
      formId: 'F2',
      pageId: '111',
      name: 'Bare',
      formStatus: 'DRAFT',
      questions: [],
      questionLabels: '',
      isEnabled: true,
      lastSyncedAt: null,
    });
  });

  it('keeps settings of forms that already exist', async () => {
    const forms = new InMemoryFormRepository();

    forms.addForm({
      formId: 'F1',
      pageId: '111',
      name: 'Old name',
      isEnabled: false,
      lastSyncedAt: '2026-09-14T09:00:00.000Z',
    });

    await syncPageForms({
      pageId: '111',
      graph: {
        listPageForms: async () => [{ ...GRAPH_FORM, name: 'New name' }],
      },
      formRepository: forms,
    });

    expect(forms.forms.get('F1')).toMatchObject({
      name: 'New name',
      questionLabels: 'Full name, What is your budget?',
      isEnabled: false,
      lastSyncedAt: '2026-09-14T09:00:00.000Z',
    });
  });

  it('skips forms deleted in Twenty and syncs the rest', async () => {
    const forms = new InMemoryFormRepository();

    forms.addForm({ formId: 'F1', pageId: '111', name: 'Removed', deleted: true });

    const count = await syncPageForms({
      pageId: '111',
      graph: {
        listPageForms: async () => [
          GRAPH_FORM,
          { id: 'F2', name: 'Kept', status: 'ACTIVE', questions: [] },
        ],
      },
      formRepository: forms,
    });

    expect(count).toBe(1);
    expect(forms.forms.get('F1')).toMatchObject({ name: 'Removed', deleted: true });
    expect(forms.forms.get('F2')).toMatchObject({ name: 'Kept' });
  });

  it('does nothing when no page is configured', async () => {
    const forms = new InMemoryFormRepository();

    expect(
      await syncPageForms({
        pageId: '  ',
        graph: {
          listPageForms: async () => {
            throw new Error('unused');
          },
        },
        formRepository: forms,
      }),
    ).toBe(0);
    expect(forms.forms.size).toBe(0);
  });
});
