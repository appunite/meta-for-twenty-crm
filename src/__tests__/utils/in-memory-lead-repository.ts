import {
  type LeadRepository,
  type MetaLeadRecord,
} from 'src/twenty-client/lead-repository';
import { type NormalizedLead } from 'src/utils/map-field-data-to-lead';

type StoredPerson = { id: string; email?: string; phone?: string; lead: NormalizedLead };

export class InMemoryLeadRepository implements LeadRepository {
  people: StoredPerson[] = [];
  metaLeads = new Map<string, MetaLeadRecord>();
  formNames = new Map<string, string>();

  addPerson(person: Omit<StoredPerson, 'lead'>) {
    this.people.push({ ...person, lead: { firstName: '', lastName: '', customAnswers: {} } });
  }

  async findMetaLeadStatus(leadgenId: string) {
    return this.metaLeads.get(leadgenId)?.status ?? null;
  }

  async findFormName(formId: string) {
    return this.formNames.get(formId) ?? null;
  }

  async findPersonIdByEmail(email: string) {
    return this.people.find((person) => person.email === email)?.id ?? null;
  }

  async findPersonIdByPhone(phone: string) {
    return this.people.find((person) => person.phone === phone)?.id ?? null;
  }

  async createPerson(lead: NormalizedLead) {
    const id = `person-${this.people.length + 1}`;

    this.people.push({ id, email: lead.email, phone: lead.phone, lead });

    return id;
  }

  async upsertMetaLead(record: MetaLeadRecord) {
    this.metaLeads.set(record.leadgenId, {
      ...this.metaLeads.get(record.leadgenId),
      ...record,
    });
  }
}
