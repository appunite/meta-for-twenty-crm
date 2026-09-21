import {
  type MetaGraphClient,
  type MetaLeadFormSummary,
} from 'src/meta-client/meta-graph-client';
import {
  type FormDetails,
  type FormRepository,
} from 'src/twenty-client/form-repository';

const toFormDetails = (form: MetaLeadFormSummary, pageId: string): FormDetails => ({
  formId: form.id,
  pageId,
  name: form.name,
  formStatus: form.status,
  locale: form.locale,
  questions: form.questions,
  questionLabels: form.questions.map((question) => question.label).join(', '),
  headline: form.headline,
  privacyPolicyUrl: form.privacyPolicyUrl,
  followUpActionUrl: form.followUpActionUrl,
  metaCreatedAt: form.createdTime
    ? new Date(form.createdTime).toISOString()
    : undefined,
  leadsCount: form.leadsCount,
  organicLeadsCount: form.organicLeadsCount,
  expiredLeadsCount: form.expiredLeadsCount,
});

export const syncPageForms = async ({
  pageId,
  graph,
  formRepository,
}: {
  pageId: string;
  graph: Pick<MetaGraphClient, 'listPageForms'>;
  formRepository: FormRepository;
}): Promise<number> => {
  const trimmedPageId = pageId.trim();

  if (trimmedPageId.length === 0) {
    return 0;
  }

  let count = 0;

  for (const form of await graph.listPageForms(trimmedPageId)) {
    if (
      (await formRepository.upsertForm(toFormDetails(form, trimmedPageId))) ===
      'stored'
    ) {
      count++;
    }
  }

  return count;
};
