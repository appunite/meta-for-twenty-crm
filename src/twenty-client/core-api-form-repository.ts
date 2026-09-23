import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  type FormDetails,
  type FormRepository,
  type SyncedForm,
  type UpsertFormResult,
} from 'src/twenty-client/form-repository';

const MAX_FORMS = 200;

// RAW_JSON fields are typed as objects by the generated client but accept arrays
type JsonValue = Record<string, unknown>;

const toData = ({ formId: _formId, questions, ...rest }: FormDetails) => ({
  ...rest,
  questions: questions as unknown as JsonValue,
});

export class CoreApiFormRepository implements FormRepository {
  constructor(private readonly client: CoreApiClient) {}

  async listEnabledForms(): Promise<SyncedForm[]> {
    const result = await this.client.query({
      metaLeadForms: {
        __args: { filter: { isEnabled: { eq: true } }, first: MAX_FORMS },
        edges: { node: { formId: true, pageId: true, lastSyncedAt: true } },
      },
    });

    type FormEdge = NonNullable<typeof result.metaLeadForms>['edges'][number];

    return (result.metaLeadForms?.edges ?? []).map(({ node }: FormEdge) => ({
      formId: node.formId ?? '',
      pageId: node.pageId ?? '',
      lastSyncedAt: node.lastSyncedAt ?? null,
    }));
  }

  async upsertForm(form: FormDetails): Promise<UpsertFormResult> {
    const existing = await this.findIncludingDeleted(form.formId);
    const data = toData(form);

    if (existing?.deletedAt) {
      return 'deleted';
    }

    if (existing) {
      await this.client.mutation({
        updateMetaLeadForm: { __args: { id: existing.id, data }, id: true },
      });

      return 'stored';
    }

    await this.client.mutation({
      createMetaLeadForm: {
        __args: { data: { ...data, formId: form.formId, isEnabled: true } },
        id: true,
      },
    });

    return 'stored';
  }

  async setLastSyncedAt(formId: string, lastSyncedAt: string): Promise<void> {
    const id = await this.findId(formId);

    if (!id) {
      return;
    }

    await this.client.mutation({
      updateMetaLeadForm: { __args: { id, data: { lastSyncedAt } }, id: true },
    });
  }

  private async findId(formId: string): Promise<string | null> {
    const result = await this.client.query({
      metaLeadForms: {
        __args: { filter: { formId: { eq: formId } }, first: 1 },
        edges: { node: { id: true } },
      },
    });

    return result.metaLeadForms?.edges[0]?.node.id ?? null;
  }

  // formId is unique across deleted rows too, so a deleted form cannot be created again
  private async findIncludingDeleted(
    formId: string,
  ): Promise<{ id: string; deletedAt: string | null } | null> {
    const result = await this.client.query({
      metaLeadForms: {
        __args: {
          filter: {
            formId: { eq: formId },
            or: [{ deletedAt: { is: 'NULL' } }, { deletedAt: { is: 'NOT_NULL' } }],
          },
          first: 1,
        },
        edges: { node: { id: true, deletedAt: true } },
      },
    });
    const node = result.metaLeadForms?.edges[0]?.node;

    return node ? { id: node.id, deletedAt: node.deletedAt ?? null } : null;
  }
}
