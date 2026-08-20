import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition } from '../src/core';

const definition = `Example DEFINITIONS ::= BEGIN
Person ::= SEQUENCE {
  name UTF8String,
  age INTEGER OPTIONAL,
  email IA5String OPTIONAL
}
Names ::= SEQUENCE OF UTF8String
Contact ::= CHOICE {
  email IA5String,
  identifier OBJECT IDENTIFIER
}
END`;

describe('parseAsn1Definition', () => {
  it('parses a small ASN.1 module into a Schema Model', () => {
    const schema = parseAsn1Definition(definition);
    expect(schema.name).toBe('Example');
    expect(schema.types).toHaveLength(3);
    expect(schema.types[0]).toMatchObject({
      name: 'Person',
      type: {
        kind: 'sequence',
        fields: [
          { name: 'name', type: { kind: 'utf8String' } },
          { name: 'age', type: { kind: 'integer' }, optional: true },
          { name: 'email', type: { kind: 'ia5String' }, optional: true }
        ]
      }
    });
  });

  it('feeds parsed definitions into the instance builder', () => {
    const schema = parseAsn1Definition(definition);
    const document = createInstance(schema, 'Person', { name: 'Alice', age: 42, email: 'alice@example.test' });
    expect(bytesToHex(document.der)).toBe('301e0c05416c69636502012a1612616c696365406578616d706c652e74657374');
  });

  it('reports malformed ASN.1 input with location details', () => {
    expect(() => parseAsn1Definition('Broken DEFINITIONS ::= BEGIN Person ::= SEQUENCE { name UTF8String END')).toThrow('Expected }');
  });
});
