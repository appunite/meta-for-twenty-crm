export type VerifyChallengeResult = { status: 200 | 400 | 403; body: string };

export const checkVerifyChallenge = ({
  query,
  verifyToken,
}: {
  query: Record<string, string | undefined>;
  verifyToken: string | undefined;
}): VerifyChallengeResult => {
  if (
    !verifyToken ||
    query['hub.mode'] !== 'subscribe' ||
    query['hub.verify_token'] !== verifyToken
  ) {
    return { status: 403, body: 'Forbidden' };
  }

  const challenge = query['hub.challenge'];

  if (!challenge) {
    return { status: 400, body: 'Missing hub.challenge' };
  }

  return { status: 200, body: challenge };
};
