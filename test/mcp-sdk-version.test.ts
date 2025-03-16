import { describe, it, expect } from 'vitest';
import { checkSdkVersionCompatibility, getSdkVersion } from '../src/utils/mcp-helpers.js';

describe('MCP SDK Version Compatibility', () => {
  it('should return the current SDK version', () => {
    expect(getSdkVersion()).toBe('1.7.0');
  });

  it('should check SDK version compatibility', () => {
    // Test with a version that should be compatible
    expect(checkSdkVersionCompatibility('0.5.0')).toBe(true);
    expect(checkSdkVersionCompatibility('1.0.0')).toBe(true);
    expect(checkSdkVersionCompatibility('1.7.0')).toBe(true);

    // Test with a version that might not be compatible (future version)
    expect(checkSdkVersionCompatibility('999.0.0')).toBe(false);
    expect(checkSdkVersionCompatibility('2.0.0')).toBe(false);
  });

  it('should handle invalid version strings', () => {
    // The function should not throw errors for invalid inputs
    expect(() => checkSdkVersionCompatibility('invalid')).not.toThrow();
    expect(checkSdkVersionCompatibility('invalid')).toBe(false);
    expect(checkSdkVersionCompatibility('1.0')).toBe(false);
    expect(checkSdkVersionCompatibility('')).toBe(false);
  });
});
