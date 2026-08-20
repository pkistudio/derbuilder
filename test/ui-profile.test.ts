import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { getUiFieldProfile, normalizeUiFieldPath, type UiProfile } from '../src/internal/app/ui-profile';

describe('UI Profile helpers', () => {
  it('normalizes string and form segment field paths', () => {
    expect(normalizeUiFieldPath(' subject.name ')).toBe('subject.name');
    expect(normalizeUiFieldPath(['extensions', 0, 'extnValue'])).toBe('extensions.0.extnValue');
  });

  it('looks up field-level hints without requiring a profile', () => {
    const profile: UiProfile = {
      id: 'example.person',
      typeName: 'Person',
      fields: {
        name: { label: 'Name', placeholder: 'Alice' },
        'payload.bytes': { inputMode: 'hex', widget: 'bytes' }
      }
    };

    expect(getUiFieldProfile(profile, ['name'])).toEqual({ label: 'Name', placeholder: 'Alice' });
    expect(getUiFieldProfile(profile, ['payload', 'bytes'])).toEqual({ inputMode: 'hex', widget: 'bytes' });
    expect(getUiFieldProfile(undefined, ['name'])).toBeUndefined();
  });

  it('falls back to repeated item template paths for numeric segments', () => {
    const profile: UiProfile = {
      id: 'example.extensions',
      typeName: 'Extensions',
      fields: {
        'extensions.*.extnID': { label: 'Extension OID', inputMode: 'oid' },
        'extensions.*.extnValue': { label: 'Extension value', inputMode: 'hex' }
      }
    };

    expect(getUiFieldProfile(profile, ['extensions', 0, 'extnID'])).toEqual({ label: 'Extension OID', inputMode: 'oid' });
    expect(getUiFieldProfile(profile, ['extensions', 3, 'extnValue'])).toEqual({ label: 'Extension value', inputMode: 'hex' });
    expect(getUiFieldProfile(profile, 'extensions.2.extnID')).toEqual({ label: 'Extension OID', inputMode: 'oid' });
  });

  it('prefers exact repeated item paths over template paths', () => {
    const profile: UiProfile = {
      id: 'example.extensions',
      typeName: 'Extensions',
      fields: {
        'extensions.*.extnID': { label: 'Extension OID' },
        'extensions.0.extnID': { label: 'First extension OID' }
      }
    };

    expect(getUiFieldProfile(profile, ['extensions', 0, 'extnID'])).toEqual({ label: 'First extension OID' });
    expect(getUiFieldProfile(profile, ['extensions', 1, 'extnID'])).toEqual({ label: 'Extension OID' });
  });
});
