import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition, type Asn1SchemaModule } from '../src/core';

const definition = `ExampleTagged DEFINITIONS ::= BEGIN
TaggedPerson ::= SEQUENCE {
  name [0] EXPLICIT UTF8String,
  age [1] IMPLICIT INTEGER OPTIONAL,
  email [2] IMPLICIT IA5String OPTIONAL
}
END`;

describe('tagged encoding', () => {
  it('encodes context-specific EXPLICIT and IMPLICIT tags from Schema Model JSON', () => {
    const schema: Asn1SchemaModule = {
      name: 'ExampleTagged',
      tagDefault: 'explicit',
      types: [
        {
          name: 'TaggedPerson',
          type: {
            kind: 'sequence',
            fields: [
              { name: 'name', type: { kind: 'tagged', tag: { class: 'context', number: 0, mode: 'explicit' }, type: { kind: 'utf8String' } } },
              { name: 'age', type: { kind: 'tagged', tag: { class: 'context', number: 1, mode: 'implicit' }, type: { kind: 'integer' } }, optional: true },
              { name: 'email', type: { kind: 'tagged', tag: { class: 'context', number: 2, mode: 'implicit' }, type: { kind: 'ia5String' } }, optional: true }
            ]
          }
        }
      ]
    };

    const document = createInstance(schema, 'TaggedPerson', { name: 'Alice', age: 42, email: 'alice@example.test' });
    expect(bytesToHex(document.der)).toBe('3020a0070c05416c69636581012a8212616c696365406578616d706c652e74657374');
  });

  it('parses tagged types and feeds them into the instance builder', () => {
    const schema = parseAsn1Definition(definition);
    expect(schema.types[0]?.type).toMatchObject({
      kind: 'sequence',
      fields: [
        { name: 'name', type: { kind: 'tagged', tag: { class: 'context', number: 0, mode: 'explicit' } } },
        { name: 'age', type: { kind: 'tagged', tag: { class: 'context', number: 1, mode: 'implicit' } }, optional: true },
        { name: 'email', type: { kind: 'tagged', tag: { class: 'context', number: 2, mode: 'implicit' } }, optional: true }
      ]
    });

    const document = createInstance(schema, 'TaggedPerson', { name: 'Alice', age: 42, email: 'alice@example.test' });
    expect(bytesToHex(document.der)).toBe('3020a0070c05416c69636581012a8212616c696365406578616d706c652e74657374');
  });
});
