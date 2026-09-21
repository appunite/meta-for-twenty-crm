import { describe, expect, it } from 'vitest';

import { escapeLikePattern } from 'src/utils/escape-like-pattern';

describe('escapeLikePattern', () => {
  it('leaves a plain email unchanged', () => {
    expect(escapeLikePattern('jane.doe@example.com')).toBe('jane.doe@example.com');
  });

  it('escapes LIKE wildcards and the escape character', () => {
    expect(escapeLikePattern('jane_doe%1\\x@example.com')).toBe(
      'jane\\_doe\\%1\\\\x@example.com',
    );
  });
});
