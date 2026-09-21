import { describe, expect, it } from 'vitest';

import { InMemoryFormRepository } from 'src/__tests__/utils/in-memory-form-repository';
import { InMemoryLeadRepository } from 'src/__tests__/utils/in-memory-lead-repository';
import {
  type MetaGraphClient,
  type MetaLeadDetails,
} from 'src/meta-client/meta-graph-client';
import { reconcileAllForms } from 'src/utils/reconcile-all-forms';

// date -j -u -f "%Y-%m-%dT%H:%M:%S" "2026-09-14T10:00:00" +%s
const NOW = new Date('2026-09-14T10:00:00.000Z');

const LEAD: MetaLeadDetails = {
  id: 'L1',
  createdTime: '2026-09-14T09:30:00+0000',
  formId: 'A',
  isOrganic: true,
  fieldData: [{ name: 'email', values: ['a@example.com'] }],
  consent: [],
};

const recordingGraph = (
  leadsByForm: Record<string, MetaLeadDetails[] | Error>,
) => {
  const listCalls: { formId: string; createdAfter: number }[] = [];
  const graph: Pick<MetaGraphClient, 'getLead' | 'listFormLeads'> = {
    listFormLeads: async (input) => {
      listCalls.push(input);
      const leads = leadsByForm[input.formId] ?? [];

      if (leads instanceof Error) {
        throw leads;
      }

      return leads;
    },
    getLead: async () => {
      throw new Error('unused');
    },
  };

  return { graph, listCalls };
};

describe('reconcileAllForms', () => {
  it('reads each form from its cursor minus the overlap, or the last 90 days', async () => {
    const forms = new InMemoryFormRepository();

    forms.addForm({ formId: 'A', lastSyncedAt: '2026-09-14T09:00:00.000Z' });
    forms.addForm({ formId: 'B', lastSyncedAt: null });
    forms.addForm({ formId: 'C', isEnabled: false });

    const { graph, listCalls } = recordingGraph({ A: [LEAD] });

    const result = await reconcileAllForms({
      formRepository: forms,
      leadRepository: new InMemoryLeadRepository(),
      graph,
      now: NOW,
    });

    expect(listCalls).toEqual([
      // 09:00 UTC (1789376400) minus 3600 s overlap
      { formId: 'A', createdAfter: 1789372800 },
      // 10:00 UTC (1789380000) minus 90 days (7776000 s)
      { formId: 'B', createdAfter: 1781604000 },
    ]);
    expect(result).toEqual({
      forms: 2,
      processed: 1,
      skipped: 0,
      failed: 0,
      failedForms: [],
    });
    expect(forms.forms.get('A')?.lastSyncedAt).toBe('2026-09-14T09:30:00.000Z');
    expect(forms.forms.get('B')?.lastSyncedAt).toBeNull();
  });

  it('ignores cursors for a backfill', async () => {
    const forms = new InMemoryFormRepository();

    forms.addForm({ formId: 'A', lastSyncedAt: '2026-09-14T09:00:00.000Z' });

    const { graph, listCalls } = recordingGraph({});

    await reconcileAllForms({
      formRepository: forms,
      leadRepository: new InMemoryLeadRepository(),
      graph,
      now: NOW,
      ignoreCursor: true,
    });

    expect(listCalls).toEqual([{ formId: 'A', createdAfter: 1781604000 }]);
  });

  it('keeps going when one form fails', async () => {
    const forms = new InMemoryFormRepository();

    forms.addForm({ formId: 'A', lastSyncedAt: null });
    forms.addForm({ formId: 'B', lastSyncedAt: null });

    const { graph } = recordingGraph({
      A: new Error('(#100) Form not accessible'),
      B: [{ ...LEAD, formId: 'B' }],
    });

    const result = await reconcileAllForms({
      formRepository: forms,
      leadRepository: new InMemoryLeadRepository(),
      graph,
      now: NOW,
    });

    expect(result).toEqual({
      forms: 2,
      processed: 1,
      skipped: 0,
      failed: 0,
      failedForms: [{ formId: 'A', error: '(#100) Form not accessible' }],
    });
    expect(forms.forms.get('A')?.lastSyncedAt).toBeNull();
  });
});
