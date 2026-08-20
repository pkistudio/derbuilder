import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition } from '../src/core';

describe('module header tagging defaults', () => {
  it('records the default EXPLICIT TAGS module header', () => {
    const schema = parseAsn1Definition(`ExplicitHeader DEFINITIONS EXPLICIT TAGS ::= BEGIN
Name ::= [0] UTF8String
END`);

    expect(schema.tagDefault).toBe('explicit');
    expect(schema.types[0]).toMatchObject({
      name: 'Name',
      type: { kind: 'tagged', tag: { class: 'context', number: 0, mode: 'explicit' } }
    });
  });

  it('uses IMPLICIT TAGS for manually tagged types without an explicit mode', () => {
    const schema = parseAsn1Definition(`ImplicitHeader DEFINITIONS IMPLICIT TAGS ::= BEGIN
Version ::= INTEGER { v1(0), v2(1), v3(2) }
VersionedSerial ::= SEQUENCE {
  version [0] Version DEFAULT v1,
  serialNumber INTEGER
}
END`);

    expect(schema.tagDefault).toBe('implicit');
    expect(schema.types[1]).toMatchObject({
      name: 'VersionedSerial',
      type: {
        kind: 'sequence',
        fields: [
          { name: 'version', type: { kind: 'tagged', tag: { class: 'context', number: 0, mode: 'implicit' } }, defaultValue: 'v1' },
          { name: 'serialNumber', type: { kind: 'integer' } }
        ]
      }
    });

    const document = createInstance(schema, 'VersionedSerial', { version: 'v3', serialNumber: 12345 });
    expect(bytesToHex(document.der)).toBe('300780010202023039');
  });

  it('automatically assigns IMPLICIT context-specific tags to untagged components', () => {
    const schema = parseAsn1Definition(`AutomaticHeader DEFINITIONS AUTOMATIC TAGS ::= BEGIN
AutomaticRecord ::= SEQUENCE {
  name UTF8String,
  age INTEGER OPTIONAL,
  email [5] IA5String OPTIONAL
}
END`);

    expect(schema.tagDefault).toBe('automatic');
    expect(schema.types[0]).toMatchObject({
      name: 'AutomaticRecord',
      type: {
        kind: 'sequence',
        fields: [
          { name: 'name', type: { kind: 'tagged', tag: { class: 'context', number: 0, mode: 'implicit' } } },
          { name: 'age', type: { kind: 'tagged', tag: { class: 'context', number: 1, mode: 'implicit' } }, optional: true },
          { name: 'email', type: { kind: 'tagged', tag: { class: 'context', number: 5, mode: 'implicit' } }, optional: true }
        ]
      }
    });

    const document = createInstance(schema, 'AutomaticRecord', { name: 'Alice', age: 42, email: 'alice@example.test' });
    expect(bytesToHex(document.der)).toBe('301e8005416c69636581012a8512616c696365406578616d706c652e74657374');
  });
});
