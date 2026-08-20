import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition, type Asn1SchemaModule } from '../src/core';

const definition = `X509VersionExample DEFINITIONS ::= BEGIN
Version ::= INTEGER {
  v1(0),
  v2(1),
  v3(2)
}
TBSCertificatePrefix ::= SEQUENCE {
  version [0] EXPLICIT Version DEFAULT v1,
  serialNumber INTEGER
}
END`;

describe('named INTEGER values', () => {
  it('encodes named INTEGER values from Schema Model JSON', () => {
    const schema: Asn1SchemaModule = {
      name: 'X509VersionExample',
      tagDefault: 'explicit',
      types: [
        { name: 'Version', type: { kind: 'integer', values: [{ name: 'v1', value: 0 }, { name: 'v2', value: 1 }, { name: 'v3', value: 2 }] } },
        {
          name: 'TBSCertificatePrefix',
          type: {
            kind: 'sequence',
            fields: [
              { name: 'version', type: { kind: 'tagged', tag: { class: 'context', number: 0, mode: 'explicit' }, type: { kind: 'defined', typeName: 'Version' } }, defaultValue: 'v1' },
              { name: 'serialNumber', type: { kind: 'integer' } }
            ]
          }
        }
      ]
    };

    const document = createInstance(schema, 'TBSCertificatePrefix', { version: 'v3', serialNumber: 12345 });
    expect(bytesToHex(document.der)).toBe('3009a00302010202023039');
  });

  it('parses X.509-style named INTEGER values and DEFAULT aliases', () => {
    const schema = parseAsn1Definition(definition);
    expect(schema.types[0]).toMatchObject({
      name: 'Version',
      type: { kind: 'integer', values: [{ name: 'v1', value: 0 }, { name: 'v2', value: 1 }, { name: 'v3', value: 2 }] }
    });
    expect(schema.types[1]).toMatchObject({
      name: 'TBSCertificatePrefix',
      type: {
        kind: 'sequence',
        fields: [
          { name: 'version', type: { kind: 'tagged', tag: { class: 'context', number: 0, mode: 'explicit' } }, defaultValue: 'v1' },
          { name: 'serialNumber', type: { kind: 'integer' } }
        ]
      }
    });
  });

  it('omits named INTEGER defaults by alias or numeric value', () => {
    const schema = parseAsn1Definition(definition);
    const aliasDefault = createInstance(schema, 'TBSCertificatePrefix', { version: 'v1', serialNumber: 7 });
    const numericDefault = createInstance(schema, 'TBSCertificatePrefix', { version: 0, serialNumber: 7 });
    const absentDefault = createInstance(schema, 'TBSCertificatePrefix', { serialNumber: 7 });
    expect(bytesToHex(aliasDefault.der)).toBe('3003020107');
    expect(bytesToHex(numericDefault.der)).toBe('3003020107');
    expect(bytesToHex(absentDefault.der)).toBe('3003020107');
  });
});
