import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition, type Asn1SchemaModule } from '../src/core';

const definition = `DefaultExample DEFINITIONS ::= BEGIN
Status ::= ENUMERATED {
  ok(0),
  warning(1),
  failed(2)
}
DefaultRecord ::= SEQUENCE {
  enabled BOOLEAN DEFAULT TRUE,
  retryCount INTEGER DEFAULT 3,
  status Status DEFAULT ok,
  note UTF8String OPTIONAL
}
END`;

describe('defaults and ENUMERATED', () => {
  it('encodes ENUMERATED values from Schema Model JSON', () => {
    const schema: Asn1SchemaModule = {
      name: 'DefaultExample',
      tagDefault: 'explicit',
      types: [
        { name: 'Status', type: { kind: 'enumerated', values: [{ name: 'ok', value: 0 }, { name: 'warning', value: 1 }, { name: 'failed', value: 2 }] } },
        {
          name: 'DefaultRecord',
          type: {
            kind: 'sequence',
            fields: [
              { name: 'enabled', type: { kind: 'boolean' }, defaultValue: true },
              { name: 'retryCount', type: { kind: 'integer' }, defaultValue: 3 },
              { name: 'status', type: { kind: 'defined', typeName: 'Status' }, defaultValue: 'ok' },
              { name: 'note', type: { kind: 'utf8String' }, optional: true }
            ]
          }
        }
      ]
    };

    const document = createInstance(schema, 'DefaultRecord', { enabled: true, retryCount: 3, status: 'warning', note: 'needs review' });
    expect(bytesToHex(document.der)).toBe('30110a01010c0c6e6565647320726576696577');
  });

  it('parses ENUMERATED and DEFAULT fields', () => {
    const schema = parseAsn1Definition(definition);
    expect(schema.types[0]).toMatchObject({
      name: 'Status',
      type: { kind: 'enumerated', values: [{ name: 'ok', value: 0 }, { name: 'warning', value: 1 }, { name: 'failed', value: 2 }] }
    });
    expect(schema.types[1]).toMatchObject({
      name: 'DefaultRecord',
      type: {
        kind: 'sequence',
        fields: [
          { name: 'enabled', type: { kind: 'boolean' }, defaultValue: true },
          { name: 'retryCount', type: { kind: 'integer' }, defaultValue: 3 },
          { name: 'status', type: { kind: 'defined', typeName: 'Status' }, defaultValue: 'ok' },
          { name: 'note', type: { kind: 'utf8String' }, optional: true }
        ]
      }
    });
  });

  it('omits absent DEFAULT fields and values equal to DEFAULT', () => {
    const schema = parseAsn1Definition(definition);
    const emptyDefaults = createInstance(schema, 'DefaultRecord', {});
    const explicitDefaults = createInstance(schema, 'DefaultRecord', { enabled: true, retryCount: 3, status: 'ok' });
    expect(bytesToHex(emptyDefaults.der)).toBe('3000');
    expect(bytesToHex(explicitDefaults.der)).toBe('3000');
  });
});
