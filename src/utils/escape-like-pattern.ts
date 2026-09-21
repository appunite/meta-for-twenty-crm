// Postgres LIKE / ILIKE treat % and _ as wildcards and \ as the escape character
export const escapeLikePattern = (value: string) =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`);
