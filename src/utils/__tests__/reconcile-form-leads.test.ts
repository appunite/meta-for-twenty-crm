import { describe, expect, it } from 'vitest';

import { InMemoryLeadRepository } from 'src/__tests__/utils/in-memory-lead-repository';
import {
  type MetaGraphClient,
  type MetaLeadDetails,
} from 'src/meta-client/meta-graph-client';
import { MetaLeadStatus } from 'src/objects/meta-lead.object';
import { reconcileFormLeads } from 'src/utils/reconcile-form-leads';

const lead = (id: string, createdTime: string, email: string): MetaLeadDetails => ({
  id,
  createdTime,
  formId: 'F1',
  isOrganic: true,
  fieldData: [
    { name: 'full_name', values: ['Jane Example'] },
    { name: 'email', values: [email] },
  ],
  consent: [],
});

describe('reconcileFormLeads', () => {
  it('processes listed leads without refetching them and reports a new cursor', async () => {
    const repository = new InMemoryLeadRepository();
    const listCalls: { formId: string; createdAfter: number }[] = [];
    const getLeadCalls: string[] = [];
    const graph: Pick<MetaGraphClient, 'getLead' | 'listFormLeads'> = {
      listFormLeads: async (input) => {
        listCalls.push(input);

        return [
          lead('L1', '2026-09-14T08:00:00+0000', 'a@example.com'),
          lead('L2', '2026-09-14T09:30:00+0000', 'b@example.com'),
        ];
      },
      getLead: async (leadgenId) => {
        getLeadCalls.push(leadgenId);
        throw new Error('should not be called');
      },
    };

    await repository.upsertMetaLead({
      leadgenId: 'L1',
      pageId: 'P1',
      formId: 'F1',
      status: MetaLeadStatus.PROCESSED,
    });

    const result = await reconcileFormLeads({
      pageId: 'P1',
      formId: 'F1',
      createdAfter: 1757800000,
      graph,
      repository,
    });

    expect(listCalls).toEqual([{ formId: 'F1', createdAfter: 1757800000 }]);
    expect(getLeadCalls).toEqual([]);
    expect(result).toEqual({
      processed: 1,
      skipped: 1,
      failed: 0,
      // date -j -u -f "%Y-%m-%dT%H:%M:%S" "2026-09-14T09:30:00" +%s
      newestCreatedTime: 1789378200,
    });
    expect(repository.metaLeads.get('L2')).toMatchObject({
      pageId: 'P1',
      formId: 'F1',
      status: MetaLeadStatus.PROCESSED,
    });
  });

  it('keeps the previous cursor when Meta returns no leads', async () => {
    const result = await reconcileFormLeads({
      pageId: 'P1',
      formId: 'F1',
      createdAfter: 1757800000,
      graph: {
        listFormLeads: async () => [],
        getLead: async () => {
          throw new Error('unused');
        },
      },
      repository: new InMemoryLeadRepository(),
    });

    expect(result).toEqual({
      processed: 0,
      skipped: 0,
      failed: 0,
      newestCreatedTime: 1757800000,
    });
  });
});
