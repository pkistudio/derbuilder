import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { parseAsn1Definition, validateInstance } from '../src/core';

const definition = `DiagnosticsExample DEFINITIONS ::= BEGIN
Person ::= SEQUENCE {
  name UTF8String,
  age INTEGER,
  payload OCTET STRING OPTIONAL,
  flags BIT STRING OPTIONAL,
  issuedAt UTCTime OPTIONAL,
  expiresAt GeneralizedTime OPTIONAL,
  emails SEQUENCE OF IA5String OPTIONAL,
  contact CHOICE {
    email IA5String,
    identifier OBJECT IDENTIFIER
  } OPTIONAL
}
END`;

describe('instance diagnostics', () => {
  it('returns no diagnostics for valid input', () => {
    const schema = parseAsn1Definition(definition);
    const diagnostics = validateInstance(schema, 'Person', {
      name: 'Alice',
      age: 42,
      payload: { hex: 'deadbeef' },
      flags: { bytes: { base64: 'oA==' }, unusedBits: 5 },
      issuedAt: '260520000000Z',
      expiresAt: '20270520000000Z',
      emails: ['alice@example.test'],
      contact: { selected: 'identifier', value: 'sha256WithRSAEncryption' }
    });

    expect(diagnostics).toEqual([]);
  });

  it('collects multiple field diagnostics with stable paths', () => {
    const schema = parseAsn1Definition(definition);
    const diagnostics = validateInstance(schema, 'Person', {
      age: 'not an integer',
      emails: ['alice@example.test', 7],
      contact: { selected: 'phone', value: '123' },
      extra: true
    });

    expect(diagnostics).toEqual([
      { severity: 'error', code: 'missing-field', message: 'Missing required field: name.', path: ['name'] },
      { severity: 'error', code: 'invalid-value', message: 'INTEGER expects a named value, number, bigint, or decimal string.', path: ['age'] },
      { severity: 'error', code: 'invalid-value', message: 'ia5String expects a string.', path: ['emails', '1'] },
      { severity: 'error', code: 'unknown-choice', message: 'Unknown CHOICE alternative: phone.', path: ['contact', 'phone'] },
      { severity: 'warning', code: 'unknown-field', message: 'Input field "extra" is not defined by the selected ASN.1 type.', path: ['extra'] }
    ]);
  });

  it('reports unknown top-level type names', () => {
    const schema = parseAsn1Definition(definition);
    expect(validateInstance(schema, 'Missing', {}).map((diagnostic) => diagnostic.code)).toEqual(['unknown-type']);
  });

  it('returns code-specific diagnostics for OID, binary, and time values', () => {
    const schema = parseAsn1Definition(definition);
    const diagnostics = validateInstance(schema, 'Person', {
      name: 'Alice',
      age: 42,
      payload: { hex: 'abc' },
      flags: { bytes: { base64: 'not base64' }, unusedBits: 9 },
      issuedAt: '2026-05-20',
      expiresAt: '20261320000000Z',
      contact: { selected: 'identifier', value: 'unknownOidName' }
    });

    expect(diagnostics).toEqual([
      { severity: 'error', code: 'invalid-hex', message: 'HEX input must contain an even number of digits.', path: ['payload'] },
      { severity: 'error', code: 'invalid-bit-string', message: 'BIT STRING unused bits must be an integer between 0 and 7.', path: ['flags', 'unusedBits'] },
      { severity: 'error', code: 'invalid-time', message: 'utcTime expects DER time text in YYMMDDHHMMSSZ form.', path: ['issuedAt'] },
      { severity: 'error', code: 'invalid-time', message: 'generalizedTime contains an out-of-range date or time component.', path: ['expiresAt'] },
      { severity: 'error', code: 'invalid-object-identifier', message: 'Unknown OID name or invalid dotted decimal OBJECT IDENTIFIER: unknownOidName.', path: ['contact', 'identifier'] }
    ]);
  });

  it('returns semantic diagnostics for byte arrays and calendar dates', () => {
    const schema = parseAsn1Definition(definition);
    const diagnostics = validateInstance(schema, 'Person', {
      name: 'Alice',
      age: 42,
      payload: [0, 256],
      flags: { bytes: [], unusedBits: 1 },
      issuedAt: '260230000000Z',
      expiresAt: '20250229000000Z'
    });

    expect(diagnostics).toEqual([
      { severity: 'error', code: 'invalid-byte-value', message: 'Byte arrays must contain integers from 0 to 255.', path: ['payload', '1'] },
      { severity: 'error', code: 'invalid-bit-string', message: 'BIT STRING unused bits must be 0 when the byte content is empty.', path: ['flags', 'unusedBits'] },
      { severity: 'error', code: 'invalid-time', message: 'utcTime contains a calendar date that does not exist.', path: ['issuedAt'] },
      { severity: 'error', code: 'invalid-time', message: 'generalizedTime contains a calendar date that does not exist.', path: ['expiresAt'] }
    ]);
  });
});
