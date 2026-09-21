import { randomUUID } from 'crypto';

import { CoreApiClient } from 'twenty-client-sdk/core';
import { afterAll, describe, expect, it } from 'vitest';

import { CoreApiFormRepository } from 'src/twenty-client/core-api-form-repository';

const client = new CoreApiClient();
const repository = new CoreApiFormRepository(client);
const runId = randomUUID().slice(0, 8);
const enabledFormId = `form-${runId}`;
const disabledFormId = `form-off-${runId}`;

afterAll(async () => {
  const forms = await client.query({
    metaLeadForms: {
      __args: { filter: { formId: { in: [enabledFormId, disabledFormId] } } },
      edges: { node: { id: true } },
    },
  });

  for (const edge of forms.metaLeadForms?.edges ?? []) {
    await client.mutation({
      destroyMetaLeadForm: { __args: { id: edge.node.id }, id: true },
    });
  }
});

const findOwn = async () =>
  (await repository.listEnabledForms()).filter((form) =>
    [enabledFormId, disabledFormId].includes(form.formId),
  );

const form = (formId: string, name: string) => ({
  formId,
  pageId: '111',
  name,
  formStatus: 'ACTIVE',
  questions: [{ key: 'email', label: 'Email', type: 'EMAIL', id: '9' }],
  questionLabels: 'Email',
});

describe('CoreApiFormRepository', () => {
  it('creates forms enabled and lists only enabled ones', async () => {
    await repository.upsertForm(form(enabledFormId, 'Autumn'));
    await repository.upsertForm(form(disabledFormId, 'Off'));

    const created = await client.query({
      metaLeadForms: {
        __args: { filter: { formId: { eq: disabledFormId } } },
        edges: { node: { id: true } },
      },
    });

    await client.mutation({
      updateMetaLeadForm: {
        __args: {
          id: created.metaLeadForms?.edges[0]?.node.id ?? '',
          data: { isEnabled: false },
        },
        id: true,
      },
    });

    expect(await findOwn()).toEqual([
      { formId: enabledFormId, pageId: '111', lastSyncedAt: null },
    ]);
  });

  it('stores the cursor and keeps it when the form is synced again', async () => {
    await repository.setLastSyncedAt(enabledFormId, '2026-09-14T09:30:00.000Z');
    await repository.upsertForm(form(enabledFormId, 'Renamed'));

    expect(await findOwn()).toEqual([
      {
        formId: enabledFormId,
        pageId: '111',
        lastSyncedAt: '2026-09-14T09:30:00.000Z',
      },
    ]);

    const stored = await client.query({
      metaLeadForms: {
        __args: { filter: { formId: { eq: enabledFormId } } },
        edges: { node: { name: true, questionLabels: true, questions: true } },
      },
    });

    expect(stored.metaLeadForms?.edges[0]?.node).toMatchObject({
      name: 'Renamed',
      questionLabels: 'Email',
      questions: [{ key: 'email', label: 'Email', type: 'EMAIL', id: '9' }],
    });
  });
});
