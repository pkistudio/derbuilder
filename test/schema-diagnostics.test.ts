import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { parseAsn1Definition, validateSchemaModule, type Asn1SchemaModule } from '../src/core';

describe('schema diagnostics', () => {
  it('returns no diagnostics for a valid parsed schema', () => {
    const schema = parseAsn1Definition(`Valid DEFINITIONS ::= BEGIN
Item ::= SEQUENCE {
  name UTF8String,
  age INTEGER OPTIONAL
}
END`);

    expect(validateSchemaModule(schema)).toEqual([]);
  });

  it('detects duplicate type names and unknown type references', () => {
    const schema: Asn1SchemaModule = {
      name: 'Broken',
      tagDefault: 'explicit',
      types: [
        { name: 'Item', type: { kind: 'sequence', fields: [{ name: 'value', type: { kind: 'defined', typeName: 'Missing' } }] } },
        { name: 'Item', type: { kind: 'null' } }
      ]
    };

    expect(validateSchemaModule(schema).map((diagnostic) => diagnostic.code)).toEqual(['duplicate-type', 'unknown-type']);
  });

  it('detects duplicate fields, duplicate tags, and unsupported tag numbers', () => {
    const schema: Asn1SchemaModule = {
      name: 'BrokenFields',
      tagDefault: 'explicit',
      types: [
        {
          name: 'Item',
          type: {
            kind: 'sequence',
            fields: [
              { name: 'value', type: { kind: 'tagged', tag: { class: 'context', number: 0, mode: 'implicit' }, type: { kind: 'integer' } } },
              { name: 'value', type: { kind: 'tagged', tag: { class: 'context', number: 0, mode: 'implicit' }, type: { kind: 'utf8String' } } },
              { name: 'overflow', type: { kind: 'tagged', tag: { class: 'context', number: 31, mode: 'implicit' }, type: { kind: 'boolean' } } }
            ]
          }
        }
      ]
    };

    expect(validateSchemaModule(schema).map((diagnostic) => diagnostic.code)).toEqual(['duplicate-field', 'duplicate-context-tag', 'unsupported-tag-number']);
  });

  it('detects duplicate named numbers', () => {
    const schema: Asn1SchemaModule = {
      name: 'NamedNumberIssues',
      tagDefault: 'explicit',
      types: [
        { name: 'Choice', type: { kind: 'enumerated', values: [{ name: 'first', value: 0 }, { name: 'first', value: 1 }, { name: 'alias', value: 1 }] } }
      ]
    };

    expect(validateSchemaModule(schema).map((diagnostic) => diagnostic.code)).toEqual(['duplicate-named-number', 'duplicate-number-value']);
  });
});
