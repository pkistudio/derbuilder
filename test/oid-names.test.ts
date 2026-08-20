import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition, resolveObjectIdentifierName } from '../src/core';

const definition = `OidNameExample DEFINITIONS ::= BEGIN
AlgorithmIdentifier ::= SEQUENCE {
  algorithm OBJECT IDENTIFIER,
  parameters NULL OPTIONAL
}
END`;

describe('OBJECT IDENTIFIER names', () => {
  it('encodes built-in OID names', () => {
    const schema = parseAsn1Definition(definition);
    const document = createInstance(schema, 'AlgorithmIdentifier', { algorithm: 'sha256WithRSAEncryption', parameters: null });
    expect(bytesToHex(document.der)).toBe('300d06092a864886f70d01010b0500');
  });

  it('encodes schema-provided OID names', () => {
    const schema = parseAsn1Definition(definition);
    schema.oidNames = { exampleAlgorithm: '1.2.3.4.5' };
    const document = createInstance(schema, 'AlgorithmIdentifier', { algorithm: 'exampleAlgorithm' });
    expect(bytesToHex(document.der)).toBe('300606042a030405');
  });

  it('leaves dotted decimal OIDs unchanged', () => {
    expect(resolveObjectIdentifierName('1.2.840.113549.1.1.1')).toBe('1.2.840.113549.1.1.1');
  });

  it('resolves PKI extension OID names', () => {
    expect(resolveObjectIdentifierName('authorityKeyIdentifier')).toBe('2.5.29.35');
  });
});
