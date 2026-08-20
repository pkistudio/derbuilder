import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition, type Asn1SchemaModule } from '../src/core';

const definition = `NegativeIntegerExample DEFINITIONS ::= BEGIN
Delta ::= INTEGER {
  lower(-129),
  minusOne(-1),
  zero(0),
  upper(127)
}
SignedRecord ::= SEQUENCE {
  delta Delta DEFAULT zero,
  offset INTEGER
}
END`;

describe('negative INTEGER values', () => {
  it('encodes minimal DER two-complement INTEGER values', () => {
    const schema: Asn1SchemaModule = {
      name: 'NegativeIntegerExample',
      tagDefault: 'explicit',
      types: [
        { name: 'MinusOne', type: { kind: 'integer' } },
        { name: 'Minus129', type: { kind: 'integer' } },
        { name: 'Minus128', type: { kind: 'integer' } }
      ]
    };

    expect(bytesToHex(createInstance(schema, 'MinusOne', -1).der)).toBe('0201ff');
    expect(bytesToHex(createInstance(schema, 'Minus128', -128).der)).toBe('020180');
    expect(bytesToHex(createInstance(schema, 'Minus129', -129).der)).toBe('0202ff7f');
  });

  it('parses negative named INTEGER values and negative defaults', () => {
    const schema = parseAsn1Definition(definition);
    expect(schema.types[0]).toMatchObject({
      name: 'Delta',
      type: { kind: 'integer', values: [{ name: 'lower', value: -129 }, { name: 'minusOne', value: -1 }, { name: 'zero', value: 0 }, { name: 'upper', value: 127 }] }
    });

    const document = createInstance(schema, 'SignedRecord', { delta: 'minusOne', offset: -129 });
    expect(bytesToHex(document.der)).toBe('30070201ff0202ff7f');
  });

  it('omits numeric defaults when the input matches by alias or value', () => {
    const schema = parseAsn1Definition(definition);
    const aliasDefault = createInstance(schema, 'SignedRecord', { delta: 'zero', offset: -1 });
    const numericDefault = createInstance(schema, 'SignedRecord', { delta: 0, offset: -1 });
    expect(bytesToHex(aliasDefault.der)).toBe('30030201ff');
    expect(bytesToHex(numericDefault.der)).toBe('30030201ff');
  });
});
