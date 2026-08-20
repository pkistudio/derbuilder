import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition } from '../src/core';

const definition = `BinaryInputExample DEFINITIONS ::= BEGIN
BinaryRecord ::= SEQUENCE {
  payload OCTET STRING,
  label OCTET STRING OPTIONAL,
  flags BIT STRING OPTIONAL
}
END`;

describe('binary input variants', () => {
  it('accepts explicit HEX, UTF-8, and Base64 byte inputs', () => {
    const schema = parseAsn1Definition(definition);
    const document = createInstance(schema, 'BinaryRecord', {
      payload: { hex: 'de ad be ef' },
      label: { utf8: 'hello' },
      flags: { bytes: { base64: 'oA==' }, unusedBits: 5 }
    });

    expect(bytesToHex(document.der)).toBe('30110404deadbeef040568656c6c6f030205a0');
  });

  it('keeps compact HEX string compatibility', () => {
    const schema = parseAsn1Definition(definition);
    const document = createInstance(schema, 'BinaryRecord', { payload: 'deadbeef' });
    expect(bytesToHex(document.der)).toBe('30060404deadbeef');
  });

  it('rejects invalid HEX characters instead of silently stripping them', () => {
    const schema = parseAsn1Definition(definition);
    expect(() => createInstance(schema, 'BinaryRecord', { payload: { hex: 'not hex' } })).toThrow('HEX input contains non-hexadecimal characters');
  });
});
