import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { findDefinitionBundleEntry, getDefinitionBundleSampleInputs, getDefinitionBundleUiProfiles, isRawAsn1BundleSchemaSource, isSchemaModelBundleSchemaSource, parseDefinitionBundleJson, parseDefinitionBundleJsonWithDiagnostics, validateDefinitionBundle, type DefinitionBundle } from '../src/internal/app/definition-bundle';

const bundle: DefinitionBundle = {
  id: 'pkistudio.example.person',
  version: '1.0.0',
  label: 'Person Bundle',
  description: 'Example bundle for a Person type.',
  schema: {
    format: 'asn1',
    sourceName: 'person.asn1',
    source: 'Example DEFINITIONS ::= BEGIN Person ::= UTF8String END'
  },
  entries: [
    {
      id: 'person-default',
      typeName: 'Person',
      label: 'Person',
      sampleInput: 'Alice',
      defaultInput: 'Sample wins over this default',
      uiProfile: {
        id: 'person-profile',
        typeName: 'Person',
        fields: {
          value: { label: 'Name' }
        }
      }
    },
    {
      id: 'person-alt',
      typeName: 'Person',
      sampleInput: 'Bob'
    },
    {
      typeName: 'Fallback',
      defaultInput: 'Default value'
    }
  ]
};

describe('Definition Bundle helpers', () => {
  it('finds entries by id before falling back to type name', () => {
    expect(findDefinitionBundleEntry(bundle, 'person-alt')?.sampleInput).toBe('Bob');
    expect(findDefinitionBundleEntry(bundle, 'Person')?.sampleInput).toBe('Alice');
    expect(findDefinitionBundleEntry(bundle, 'Missing')).toBeUndefined();
  });

  it('collects entry sample inputs by type name with default input fallback', () => {
    expect(getDefinitionBundleSampleInputs(bundle)).toEqual({ Person: 'Alice', Fallback: 'Default value' });
  });

  it('ignores unknown bundle fields in helper behavior', () => {
    const extendedBundle = { ...bundle, extensions: { source: 'downstream-host' } } as DefinitionBundle;

    expect(findDefinitionBundleEntry(extendedBundle, 'person-default')?.sampleInput).toBe('Alice');
    expect(getDefinitionBundleSampleInputs(extendedBundle).Person).toBe('Alice');
  });

  it('collects entry UI Profiles by type name', () => {
    expect(getDefinitionBundleUiProfiles(bundle).Person?.id).toBe('person-profile');
  });

  it('narrows raw ASN.1 schema sources', () => {
    expect(isRawAsn1BundleSchemaSource(bundle.schema)).toBe(true);
    expect(isSchemaModelBundleSchemaSource(bundle.schema)).toBe(false);
    if (isRawAsn1BundleSchemaSource(bundle.schema)) expect(bundle.schema.sourceName).toBe('person.asn1');
  });

  it('narrows parsed Schema Model sources', () => {
    const parsedBundle: DefinitionBundle = {
      id: 'pkistudio.example.schema-model',
      version: '1.0.0',
      label: 'Schema Model Bundle',
      schema: {
        format: 'schema-model',
        schema: {
          name: 'Example',
          tagDefault: 'explicit',
          types: []
        }
      },
      entries: []
    };

    expect(isRawAsn1BundleSchemaSource(parsedBundle.schema)).toBe(false);
    expect(isSchemaModelBundleSchemaSource(parsedBundle.schema)).toBe(true);
  });

  it('parses Definition Bundle JSON while preserving unknown host metadata', () => {
    const parsed = parseDefinitionBundleJson(JSON.stringify({
      ...bundle,
      hostMetadata: { owner: 'downstream-host' }
    }), 'person.definition-bundle.json') as DefinitionBundle & { hostMetadata?: { owner: string } };

    expect(parsed.id).toBe('pkistudio.example.person');
    expect(parsed.entries[0]?.sampleInput).toBe('Alice');
    expect(parsed.hostMetadata?.owner).toBe('downstream-host');
  });

  it('returns Definition Bundle diagnostics without throwing', () => {
    const result = parseDefinitionBundleJsonWithDiagnostics(JSON.stringify({
      id: 'pkistudio.example.invalid',
      version: 1,
      label: '',
      schema: { format: 'unsupported' },
      entries: [{ id: 1, uiProfile: [] }]
    }));

    expect(result.bundle).toBeUndefined();
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', code: 'invalid-string', path: ['version'] }),
      expect.objectContaining({ severity: 'error', code: 'invalid-string', path: ['label'] }),
      expect.objectContaining({ severity: 'error', code: 'invalid-schema-format', path: ['schema', 'format'] }),
      expect.objectContaining({ severity: 'error', code: 'invalid-string', path: ['entries', '0', 'id'] }),
      expect.objectContaining({ severity: 'error', code: 'missing-string', path: ['entries', '0', 'typeName'] }),
      expect.objectContaining({ severity: 'error', code: 'expected-object', path: ['entries', '0', 'uiProfile'] })
    ]));
  });

  it('validates Definition Bundle values directly', () => {
    expect(validateDefinitionBundle({ ...bundle, entries: [] })).toEqual([
      expect.objectContaining({ severity: 'error', code: 'missing-entry', path: ['entries'] })
    ]);
  });

  it('rejects Definition Bundle JSON with missing required fields', () => {
    expect(() => parseDefinitionBundleJson(JSON.stringify({
      id: 'pkistudio.example.invalid',
      version: '1.0.0',
      label: 'Invalid Bundle',
      schema: { format: 'asn1', source: 'Example DEFINITIONS ::= BEGIN Person ::= UTF8String END' },
      entries: [{}]
    }), 'invalid.definition-bundle.json')).toThrow('invalid.definition-bundle.json missing-string at entries.0.typeName');
  });

  it('rejects malformed Definition Bundle JSON', () => {
    const result = parseDefinitionBundleJsonWithDiagnostics('{');

    expect(result.bundle).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', code: 'invalid-json', path: [] })
    ]);
    expect(() => parseDefinitionBundleJson('{', 'broken.definition-bundle.json')).toThrow('broken.definition-bundle.json invalid-json');
  });
});
