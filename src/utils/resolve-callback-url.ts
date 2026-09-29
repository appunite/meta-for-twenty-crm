import { META_WEBHOOK_PATH } from 'src/constants/logic-function-universal-identifiers';

export const resolveCallbackUrl = ({
  override,
  defaultUrl,
}: {
  override: string | undefined;
  defaultUrl: string;
}): string => {
  const trimmed = override?.trim();

  if (!trimmed) {
    return defaultUrl;
  }

  try {
    const url = new URL(trimmed);

    return url.pathname === '/' && !url.search
      ? `${url.origin}/s${META_WEBHOOK_PATH}`
      : trimmed;
  } catch {
    return trimmed;
  }
};
