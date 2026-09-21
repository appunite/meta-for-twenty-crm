import { describe, expect, it } from 'vitest';

import { InMemoryLeadRepository } from 'src/__tests__/utils/in-memory-lead-repository';
import { MetaGraphError } from 'src/meta-client/http-meta-graph-client';
import {
  type MetaGraphClient,
  type MetaLeadDetails,
} from 'src/meta-client/meta-graph-client';
import { MetaLeadPlatform, MetaLeadStatus } from 'src/objects/meta-lead.object';
import { type LeadgenEvent } from 'src/utils/parse-leadgen-webhook';
import { processLead } from 'src/utils/process-lead';

const EVENT: LeadgenEvent = {
  leadgenId: '444444444444',
  pageId: '111111111111',
  formId: '222222222222',
  adId: '333333333333',
  createdTime: 1757846399,
};

const LEAD: MetaLeadDetails = {
  id: '444444444444',
  createdTime: '2026-09-14T08:49:14+0000',
  formId: '222222222222',
  adId: '333333333333',
  adName: 'Autumn ad',
  adsetId: '555',
  adsetName: 'PL 25-45',
  campaignId: '666',
  campaignName: 'Autumn',
  isOrganic: false,
  platform: 'ig',
  fieldData: [
    { name: 'full_name', values: ['Jane Example'] },
    { name: 'email', values: ['Jane@Example.com'] },
    { name: 'phone_number', values: ['+48600100200'] },
  ],
  consent: [{ checkbox_key: 'marketing_optin', is_checked: '1' }],
};

const graphReturning = (lead: MetaLeadDetails) => {
  const requested: string[] = [];
  const graph: Pick<MetaGraphClient, 'getLead'> = {
    getLead: async (leadgenId) => {
      requested.push(leadgenId);

      return lead;
    },
  };

  return { graph, requested };
};

describe('processLead', () => {
  it('creates a person and a processed MetaLead for a new lead', async () => {
    const repository = new InMemoryLeadRepository();
    const { graph, requested } = graphReturning(LEAD);

    const result = await processLead({ event: EVENT, graph, repository });

    expect(requested).toEqual(['444444444444']);
    expect(repository.people.map((person) => person.lead.email)).toEqual([
      'jane@example.com',
    ]);
    expect(result).toEqual({
      status: MetaLeadStatus.PROCESSED,
      personId: 'person-1',
    });
    expect(repository.metaLeads.get('444444444444')).toEqual({
      name: 'Jane Example',
      leadgenId: '444444444444',
      pageId: '111111111111',
      formId: '222222222222',
      adId: '333333333333',
      adName: 'Autumn ad',
      adsetId: '555',
      adsetName: 'PL 25-45',
      campaignId: '666',
      campaignName: 'Autumn',
      platform: MetaLeadPlatform.INSTAGRAM,
      isOrganic: false,
      submittedAt: '2026-09-14T08:49:14.000Z',
      fieldData: LEAD.fieldData,
      consent: LEAD.consent,
      status: MetaLeadStatus.PROCESSED,
      personId: 'person-1',
    });
  });

  it('links an existing person matched by email', async () => {
    const repository = new InMemoryLeadRepository();

    repository.addPerson({ id: 'existing', email: 'jane@example.com' });

    const result = await processLead({
      event: EVENT,
      graph: graphReturning(LEAD).graph,
      repository,
    });

    expect(result).toEqual({
      status: MetaLeadStatus.PROCESSED,
      personId: 'existing',
    });
    expect(repository.people).toHaveLength(1);
  });

  it('falls back to phone when email does not match', async () => {
    const repository = new InMemoryLeadRepository();

    repository.addPerson({ id: 'by-phone', phone: '+48600100200' });

    const result = await processLead({
      event: EVENT,
      graph: graphReturning(LEAD).graph,
      repository,
    });

    expect(result).toEqual({
      status: MetaLeadStatus.PROCESSED,
      personId: 'by-phone',
    });
    expect(repository.people).toHaveLength(1);
  });

  it('stores the form name when the form is known', async () => {
    const repository = new InMemoryLeadRepository();

    repository.formNames.set(EVENT.formId, 'Autumn contact form');

    await processLead({ event: EVENT, graph: graphReturning(LEAD).graph, repository });

    expect(repository.metaLeads.get(EVENT.leadgenId)?.formName).toBe(
      'Autumn contact form',
    );
  });

  it('skips a lead that was already processed without calling Meta', async () => {
    const repository = new InMemoryLeadRepository();
    const { graph, requested } = graphReturning(LEAD);

    await repository.upsertMetaLead({
      leadgenId: EVENT.leadgenId,
      pageId: EVENT.pageId,
      formId: EVENT.formId,
      status: MetaLeadStatus.PROCESSED,
      personId: 'p',
    });

    const result = await processLead({ event: EVENT, graph, repository });

    expect(result).toEqual({ status: MetaLeadStatus.SKIPPED });
    expect(requested).toEqual([]);
  });

  it('records a failure when Meta returns an error', async () => {
    const repository = new InMemoryLeadRepository();
    const graph: Pick<MetaGraphClient, 'getLead'> = {
      getLead: async () => {
        throw new Error('(#100) Missing permission');
      },
    };

    const result = await processLead({ event: EVENT, graph, repository });

    expect(result).toEqual({
      status: MetaLeadStatus.FAILED,
      error: '(#100) Missing permission',
      retryable: false,
    });
    expect(repository.metaLeads.get(EVENT.leadgenId)).toMatchObject({
      status: MetaLeadStatus.FAILED,
      errorMessage: '(#100) Missing permission',
    });
    expect(repository.people).toEqual([]);
  });

  it('records a failure with the answers when saving the person fails', async () => {
    const repository = new InMemoryLeadRepository();

    repository.createPerson = async () => {
      throw new Error('Provided phone number is invalid');
    };

    const result = await processLead({
      event: EVENT,
      graph: graphReturning(LEAD).graph,
      repository,
    });

    expect(result).toEqual({
      status: MetaLeadStatus.FAILED,
      error: 'Provided phone number is invalid',
      retryable: false,
    });
    expect(repository.metaLeads.get(EVENT.leadgenId)).toMatchObject({
      status: MetaLeadStatus.FAILED,
      errorMessage: 'Provided phone number is invalid',
      fieldData: LEAD.fieldData,
    });
  });

  it('leaves a lead processed by a concurrent run untouched', async () => {
    const repository = new InMemoryLeadRepository();
    const upsert = repository.upsertMetaLead.bind(repository);
    let raced = false;

    repository.upsertMetaLead = async (record) => {
      if (!raced) {
        raced = true;
        await upsert({
          ...record,
          status: MetaLeadStatus.PROCESSED,
          personId: 'person-other',
        });
        throw new Error('duplicate key value violates unique constraint');
      }

      await upsert(record);
    };

    const result = await processLead({
      event: EVENT,
      graph: graphReturning(LEAD).graph,
      repository,
    });

    expect(result).toEqual({ status: MetaLeadStatus.SKIPPED });
    expect(repository.metaLeads.get(EVENT.leadgenId)).toMatchObject({
      status: MetaLeadStatus.PROCESSED,
      personId: 'person-other',
    });
  });

  it('marks rate limit failures as retryable', async () => {
    const repository = new InMemoryLeadRepository();
    const graph: Pick<MetaGraphClient, 'getLead'> = {
      getLead: async () => {
        throw new MetaGraphError({
          message: 'Application request limit reached',
          code: 4,
          status: 400,
        });
      },
    };

    const result = await processLead({ event: EVENT, graph, repository });

    expect(result).toEqual({
      status: MetaLeadStatus.FAILED,
      error: 'Application request limit reached',
      retryable: true,
    });
    expect(repository.metaLeads.get(EVENT.leadgenId)?.status).toBe(
      MetaLeadStatus.FAILED,
    );
  });
});
