export type MetaFieldData = { name: string; values: string[] }[];

export type NormalizedLead = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  city?: string;
  companyName?: string;
  jobTitle?: string;
  customAnswers: Record<string, string>;
};

const STANDARD_KEYS = {
  city: 'city',
  company_name: 'companyName',
  job_title: 'jobTitle',
  phone_number: 'phone',
} as const;

const NAME_KEYS = new Set(['full_name', 'first_name', 'last_name', 'email']);

const splitFullName = (fullName: string): [string, string] => {
  const [first = '', ...rest] = fullName.trim().split(/\s+/);

  return [first, rest.join(' ')];
};

export const mapFieldDataToLead = (fieldData: MetaFieldData): NormalizedLead => {
  const answers = new Map(
    fieldData.map(({ name, values }) => [name, values.join(', ').trim()]),
  );

  const [fullFirst, fullLast] = splitFullName(answers.get('full_name') ?? '');
  const lead: NormalizedLead = {
    firstName: answers.get('first_name') || fullFirst,
    lastName: answers.get('last_name') || fullLast,
    customAnswers: {},
  };

  const email = answers.get('email');

  if (email) {
    lead.email = email.toLowerCase();
  }

  for (const [name, value] of answers) {
    if (NAME_KEYS.has(name) || !value) {
      continue;
    }

    if (name in STANDARD_KEYS) {
      lead[STANDARD_KEYS[name as keyof typeof STANDARD_KEYS]] = value;
    } else {
      lead.customAnswers[name] = value;
    }
  }

  return lead;
};
