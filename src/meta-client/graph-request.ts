export const META_GRAPH_API_VERSION = 'v25.0';

const GRAPH_BASE_URL = 'https://graph.facebook.com';

type GraphErrorBody = {
  error?: { message?: string; code?: number; error_subcode?: number };
};

export class MetaGraphError extends Error {
  readonly code?: number;
  readonly subcode?: number;
  readonly status: number;

  constructor({
    message,
    code,
    subcode,
    status,
  }: {
    message: string;
    code?: number;
    subcode?: number;
    status: number;
  }) {
    super(message);
    this.name = 'MetaGraphError';
    this.code = code;
    this.subcode = subcode;
    this.status = status;
  }
}

export const graphUrl = (path: string, params: Record<string, string>): string => {
  const url = new URL(`${GRAPH_BASE_URL}/${META_GRAPH_API_VERSION}/${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};

export const graphRequest = async <T>({
  fetchFn,
  url,
  accessToken,
  form,
}: {
  fetchFn: typeof fetch;
  url: string;
  accessToken?: string;
  form?: Record<string, string>;
}): Promise<T> => {
  const response = await fetchFn(url, {
    method: form ? 'POST' : 'GET',
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
    ...(form ? { body: new URLSearchParams(form) } : {}),
  });
  // Gateways in front of the Graph API can answer 5xx with an HTML page
  const body = (await response.json().catch(() => undefined)) as
    | (T & GraphErrorBody)
    | undefined;

  if (!response.ok || !body || body.error) {
    throw new MetaGraphError({
      message: body?.error?.message ?? `Graph API responded ${response.status}`,
      code: body?.error?.code,
      subcode: body?.error?.error_subcode,
      status: response.status,
    });
  }

  return body;
};
