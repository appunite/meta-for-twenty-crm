import { type CoreApiClient } from 'twenty-client-sdk/core';

import { type MetaLeadStatus } from 'src/objects/meta-lead.object';
import {
  type LeadRepository,
  type MetaLeadRecord,
} from 'src/twenty-client/lead-repository';
import { escapeLikePattern } from 'src/utils/escape-like-pattern';
import { type NormalizedLead } from 'src/utils/map-field-data-to-lead';
import { normalizePhone } from 'src/utils/normalize-phone';
import { toPhonesInput } from 'src/utils/to-phones-input';

// RAW_JSON fields are typed as objects by the generated client but accept arrays
type JsonValue = Record<string, unknown>;

export class CoreApiLeadRepository implements LeadRepository {
  constructor(private readonly client: CoreApiClient) {}

  async findMetaLeadStatus(leadgenId: string): Promise<MetaLeadStatus | null> {
    return ((await this.findMetaLead(leadgenId))?.status as MetaLeadStatus) ?? null;
  }

  async findFormName(formId: string): Promise<string | null> {
    const result = await this.client.query({
      metaLeadForms: {
        __args: { filter: { formId: { eq: formId } }, first: 1 },
        edges: { node: { name: true } },
      },
    });

    return result.metaLeadForms?.edges[0]?.node.name || null;
  }

  // Twenty stores emails as typed, so the match has to ignore case
  async findPersonIdByEmail(email: string): Promise<string | null> {
    const result = await this.client.query({
      people: {
        __args: {
          filter: { emails: { primaryEmail: { ilike: escapeLikePattern(email) } } },
          first: 1,
        },
        edges: { node: { id: true } },
      },
    });

    return result.people?.edges[0]?.node.id ?? null;
  }

  async findPersonIdByPhone(rawPhone: string): Promise<string | null> {
    const phone = normalizePhone(rawPhone);

    if (!phone) {
      return null;
    }

    const result = await this.client.query({
      people: {
        __args: {
          filter: {
            phones: {
              primaryPhoneNumber: { eq: phone.nationalNumber },
              primaryPhoneCallingCode: { eq: phone.callingCode },
            },
          },
          first: 1,
        },
        edges: { node: { id: true } },
      },
    });

    return result.people?.edges[0]?.node.id ?? null;
  }

  async createPerson(lead: NormalizedLead): Promise<string> {
    const result = await this.client.mutation({
      createPerson: {
        __args: {
          data: {
            name: { firstName: lead.firstName, lastName: lead.lastName },
            emails: lead.email ? { primaryEmail: lead.email } : undefined,
            phones: lead.phone ? toPhonesInput(lead.phone) : undefined,
            jobTitle: lead.jobTitle,
          },
        },
        id: true,
      },
    });

    const id = result.createPerson?.id;

    if (!id) {
      throw new Error('createPerson returned no id');
    }

    return id;
  }

  async upsertMetaLead(record: MetaLeadRecord): Promise<void> {
    const data = {
      ...record,
      name: record.name ?? record.leadgenId,
      fieldData: record.fieldData as unknown as JsonValue,
      consent: record.consent as unknown as JsonValue,
      errorMessage: record.errorMessage ?? null,
    };
    const existing = await this.findMetaLead(record.leadgenId);

    if (existing) {
      await this.client.mutation({
        updateMetaLead: { __args: { id: existing.id, data }, id: true },
      });

      return;
    }

    await this.client.mutation({
      createMetaLead: { __args: { data }, id: true },
    });
  }

  private async findMetaLead(leadgenId: string) {
    const result = await this.client.query({
      metaLeads: {
        __args: { filter: { leadgenId: { eq: leadgenId } }, first: 1 },
        edges: { node: { id: true, status: true } },
      },
    });

    return result.metaLeads?.edges[0]?.node ?? null;
  }
}
