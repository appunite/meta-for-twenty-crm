import { randomUUID } from 'crypto';

import { CoreApiClient } from 'twenty-client-sdk/core';
import { afterAll, describe, expect, it } from 'vitest';

import { MetaLeadPlatform, MetaLeadStatus } from 'src/objects/meta-lead.object';
import { CoreApiFormRepository } from 'src/twenty-client/core-api-form-repository';
import { CoreApiLeadRepository } from 'src/twenty-client/core-api-lead-repository';

const client = new CoreApiClient();
const repository = new CoreApiLeadRepository(client);
const runId = randomUUID().slice(0, 8);
const createdPersonIds: string[] = [];
const createdLeadgenIds: string[] = [];

const createTestPerson = async (suffix: string) => {
  const id = await repository.createPerson({
    firstName: 'Jane',
    lastName: `Test ${runId}`,
    email: `jane.${suffix}.${runId}@example.com`,
    phone: `+4860${runId.replace(/\D/g, '').padEnd(7, '1').slice(0, 7)}`,
    jobTitle: 'CTO',
    customAnswers: {},
  });

  createdPersonIds.push(id);

  return id;
};

afterAll(async () => {
  if (createdLeadgenIds.length > 0) {
    const leads = await client.query({
      metaLeads: {
        __args: { filter: { leadgenId: { in: createdLeadgenIds } } },
        edges: { node: { id: true } },
      },
    });

    for (const edge of leads.metaLeads?.edges ?? []) {
      await client.mutation({
        destroyMetaLead: { __args: { id: edge.node.id }, id: true },
      });
    }
  }

  for (const id of createdPersonIds) {
    await client.mutation({ destroyPerson: { __args: { id }, id: true } });
  }
});

describe('CoreApiLeadRepository', () => {
  it('creates a person and finds it by email and by phone', async () => {
    const id = await createTestPerson('find');

    expect(
      await repository.findPersonIdByEmail(`jane.find.${runId}@example.com`),
    ).toBe(id);
    expect(
      await repository.findPersonIdByEmail(`JANE.Find.${runId}@Example.com`),
    ).toBe(id);
    expect(
      await repository.findPersonIdByEmail(`jane_find.${runId}@example.com`),
    ).toBeNull();
    expect(
      await repository.findPersonIdByPhone(
        `+4860${runId.replace(/\D/g, '').padEnd(7, '1').slice(0, 7)}`,
      ),
    ).toBe(id);
  });

  it('returns null for an unknown email', async () => {
    expect(
      await repository.findPersonIdByEmail(`nobody.${runId}@example.com`),
    ).toBeNull();
  });

  it('finds the name of a synced form', async () => {
    const formId = `form-${runId}`;

    await new CoreApiFormRepository(client).upsertForm({
      formId,
      pageId: '111',
      name: 'Autumn contact form',
      formStatus: 'ACTIVE',
      questions: [],
      questionLabels: '',
    });

    try {
      expect(await repository.findFormName(formId)).toBe('Autumn contact form');
      expect(await repository.findFormName(`missing-${runId}`)).toBeNull();
    } finally {
      const forms = await client.query({
        metaLeadForms: {
          __args: { filter: { formId: { eq: formId } } },
          edges: { node: { id: true } },
        },
      });

      for (const edge of forms.metaLeadForms?.edges ?? []) {
        await client.mutation({
          destroyMetaLeadForm: { __args: { id: edge.node.id }, id: true },
        });
      }
    }
  });

  it('upserts one MetaLead per leadgenId and keeps the latest status', async () => {
    const leadgenId = `test-${runId}`;
    const personId = await createTestPerson('lead');

    createdLeadgenIds.push(leadgenId);

    expect(await repository.findMetaLeadStatus(leadgenId)).toBeNull();

    await repository.upsertMetaLead({
      leadgenId,
      pageId: '111',
      formId: '222',
      status: MetaLeadStatus.FAILED,
      errorMessage: 'temporary',
    });
    await repository.upsertMetaLead({
      leadgenId,
      pageId: '111',
      formId: '222',
      platform: MetaLeadPlatform.INSTAGRAM,
      isOrganic: true,
      submittedAt: '2026-09-14T08:49:14.000Z',
      fieldData: [{ name: 'email', values: ['x@example.com'] }],
      consent: [],
      status: MetaLeadStatus.PROCESSED,
      personId,
    });

    expect(await repository.findMetaLeadStatus(leadgenId)).toBe(
      MetaLeadStatus.PROCESSED,
    );

    const stored = await client.query({
      metaLeads: {
        __args: { filter: { leadgenId: { eq: leadgenId } } },
        edges: {
          node: { personId: true, platform: true, status: true, errorMessage: true },
        },
      },
    });

    type LeadEdge = NonNullable<typeof stored.metaLeads>['edges'][number];

    expect(stored.metaLeads?.edges.map((edge: LeadEdge) => edge.node)).toEqual([
      {
        personId,
        platform: MetaLeadPlatform.INSTAGRAM,
        status: MetaLeadStatus.PROCESSED,
        errorMessage: '',
      },
    ]);
  });
});
