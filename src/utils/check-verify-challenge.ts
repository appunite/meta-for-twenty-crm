export type VerifyChallengeResult = { status: 200 | 400 | 403; body: string };

export const checkVerifyChallenge = ({
  query,
  acceptedTokens,
}: {
  query: Record<string, string | undefined>;
  acceptedTokens: string[];
}): VerifyChallengeResult => {
  const token = query['hub.verify_token'];

  if (
    !token ||
    query['hub.mode'] !== 'subscribe' ||
    !acceptedTokens.includes(token)
  ) {
    return { status: 403, body: 'Forbidden' };
  }

  const challenge = query['hub.challenge'];

  if (!challenge) {
    return { status: 400, body: 'Missing hub.challenge' };
  }

  return { status: 200, body: challenge };
};
