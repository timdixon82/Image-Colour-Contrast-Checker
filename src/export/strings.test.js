import { describe, it, expect } from 'vitest';
import { vestibularCheckerUrl, VESTIBULAR_CHECKER_FULL_LABEL } from './strings.js';

describe('vestibularCheckerUrl', () => {
  it('builds the VADChecker URL with txt and bg, hash stripped', () => {
    expect(vestibularCheckerUrl('#FFFFFF', '#122222'))
      .toBe('https://vadchecker.com/tool/?txt=ffffff&bg=122222');
  });
  it('accepts hex without a hash and lower-cases it', () => {
    expect(vestibularCheckerUrl('AbCdEf', '0C3B64'))
      .toBe('https://vadchecker.com/tool/?txt=abcdef&bg=0c3b64');
  });
  it('falls back to the bare tool URL when a colour is invalid', () => {
    const bare = 'https://vadchecker.com/tool/';
    expect(vestibularCheckerUrl('#fff', '#122222')).toBe(bare);
    expect(vestibularCheckerUrl('#ffffff', 'zzzzzz')).toBe(bare);
    expect(vestibularCheckerUrl(undefined, null)).toBe(bare);
    expect(vestibularCheckerUrl('#ffffff&x=1', '#122222')).toBe(bare);
  });
  it('keeps the new-window announcement in the full label', () => {
    expect(VESTIBULAR_CHECKER_FULL_LABEL).toContain('VADChecker');
    expect(VESTIBULAR_CHECKER_FULL_LABEL).toContain('(opens in new window)');
  });
});
