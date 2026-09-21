import {
  type FormDetails,
  type FormRepository,
  type SyncedForm,
  type UpsertFormResult,
} from 'src/twenty-client/form-repository';

type StoredForm = FormDetails & {
  isEnabled: boolean;
  lastSyncedAt: string | null;
  deleted?: boolean;
};

export class InMemoryFormRepository implements FormRepository {
  forms = new Map<string, StoredForm>();

  addForm(form: Partial<StoredForm> & { formId: string }) {
    this.forms.set(form.formId, {
      pageId: 'P1',
      name: form.formId,
      formStatus: 'ACTIVE',
      questions: [],
      questionLabels: '',
      isEnabled: true,
      lastSyncedAt: null,
      ...form,
    });

    return 'stored';
  }

  async listEnabledForms(): Promise<SyncedForm[]> {
    return [...this.forms.values()]
      .filter((form) => form.isEnabled && !form.deleted)
      .map(({ formId, pageId, lastSyncedAt }) => ({ formId, pageId, lastSyncedAt }));
  }

  async upsertForm(form: FormDetails): Promise<UpsertFormResult> {
    const existing = this.forms.get(form.formId);

    if (existing?.deleted) {
      return 'deleted';
    }

    this.forms.set(form.formId, {
      isEnabled: true,
      lastSyncedAt: null,
      ...existing,
      ...form,
    });

    return 'stored';
  }

  async setLastSyncedAt(formId: string, lastSyncedAt: string) {
    const existing = this.forms.get(formId);

    if (existing) {
      existing.lastSyncedAt = lastSyncedAt;
    }
  }
}
