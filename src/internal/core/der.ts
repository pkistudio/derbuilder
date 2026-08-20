import { concatBytes } from './bytes.js';

const universalTags = {
  boolean: 0x01,
  integer: 0x02,
  bitString: 0x03,
  octetString: 0x04,
  null: 0x05,
  objectIdentifier: 0x06,
  enumerated: 0x0a,
  sequence: 0x30,
  set: 0x31,
  printableString: 0x13,
  ia5String: 0x16,
  utcTime: 0x17,
  generalizedTime: 0x18,
  utf8String: 0x0c
} as const;

export function encodeBoolean(value: boolean): Uint8Array {
  return encodeTlv(universalTags.boolean, Uint8Array.of(value ? 0xff : 0x00));
}

export function encodeInteger(input: bigint | number | string): Uint8Array {
  return encodeTlv(universalTags.integer, encodeIntegerContent(input));
}

export function encodeEnumerated(input: bigint | number | string): Uint8Array {
  return encodeTlv(universalTags.enumerated, encodeIntegerContent(input));
}

function encodeIntegerContent(input: bigint | number | string): Uint8Array {
  const value = typeof input === 'bigint' ? input : BigInt(input);
  if (value === 0n) return Uint8Array.of(0);
  if (value < 0n) return encodeNegativeIntegerContent(value);

  const content: number[] = [];
  let remaining = value;
  while (remaining > 0n) {
    content.unshift(Number(remaining & 0xffn));
    remaining >>= 8n;
  }
  if ((content[0] & 0x80) !== 0) content.unshift(0);
  return Uint8Array.from(content);
}

function encodeNegativeIntegerContent(value: bigint): Uint8Array {
  const content: number[] = [];
  let byteLength = 1;
  while (value < -(1n << BigInt(byteLength * 8 - 1))) {
    byteLength += 1;
  }
  const unsignedValue = (1n << BigInt(byteLength * 8)) + value;
  for (let index = byteLength - 1; index >= 0; index -= 1) {
    content.push(Number((unsignedValue >> BigInt(index * 8)) & 0xffn));
  }
  return Uint8Array.from(content);
}

export function encodeBitString(bytes: Uint8Array, unusedBits = 0): Uint8Array {
  if (!Number.isInteger(unusedBits) || unusedBits < 0 || unusedBits > 7) {
    throw new Error('BIT STRING unused bits must be an integer between 0 and 7.');
  }
  return encodeTlv(universalTags.bitString, concatBytes([Uint8Array.of(unusedBits), bytes]));
}

export function encodeOctetString(bytes: Uint8Array): Uint8Array {
  return encodeTlv(universalTags.octetString, bytes);
}

export function encodeNull(): Uint8Array {
  return encodeTlv(universalTags.null, new Uint8Array());
}

export function encodeObjectIdentifier(oid: string): Uint8Array {
  const arcs = oid.split('.').map((part) => Number.parseInt(part, 10));
  if (arcs.length < 2 || arcs.some((arc) => !Number.isInteger(arc) || arc < 0)) {
    throw new Error('OBJECT IDENTIFIER must use dotted decimal notation.');
  }
  if (arcs[0] > 2 || (arcs[0] < 2 && arcs[1] > 39)) {
    throw new Error('OBJECT IDENTIFIER has an invalid first or second arc.');
  }
  const content = [arcs[0] * 40 + arcs[1], ...arcs.slice(2).flatMap(encodeBase128Arc)];
  return encodeTlv(universalTags.objectIdentifier, Uint8Array.from(content));
}

export function encodeText(kind: 'utf8String' | 'printableString' | 'ia5String' | 'utcTime' | 'generalizedTime', value: string): Uint8Array {
  const encoder = new TextEncoder();
  const bytes = kind === 'utf8String' ? encoder.encode(value) : asciiBytes(value);
  return encodeTlv(universalTags[kind], bytes);
}

export function encodeSequence(children: Uint8Array[]): Uint8Array {
  return encodeTlv(universalTags.sequence, concatBytes(children));
}

export function encodeSet(children: Uint8Array[]): Uint8Array {
  const sorted = [...children].sort(compareDerLexicographically);
  return encodeTlv(universalTags.set, concatBytes(sorted));
}

export function encodeExplicitContextSpecificTag(tagNumber: number, inner: Uint8Array): Uint8Array {
  return encodeTlv(contextSpecificTagByte(tagNumber, true), inner);
}

export function encodeImplicitContextSpecificTag(tagNumber: number, inner: Uint8Array): Uint8Array {
  const header = readTlvHeader(inner);
  const constructed = (inner[0] & 0x20) !== 0;
  const content = inner.slice(header.contentOffset);
  return encodeTlv(contextSpecificTagByte(tagNumber, constructed), content);
}

export function encodeTlv(tag: number, content: Uint8Array): Uint8Array {
  return concatBytes([Uint8Array.of(tag), encodeLength(content.length), content]);
}

function contextSpecificTagByte(tagNumber: number, constructed: boolean): number {
  if (!Number.isInteger(tagNumber) || tagNumber < 0 || tagNumber > 30) {
    throw new Error('Only low-form context-specific tag numbers from 0 to 30 are supported.');
  }
  return 0x80 | (constructed ? 0x20 : 0) | tagNumber;
}

function readTlvHeader(bytes: Uint8Array): { contentOffset: number } {
  if (bytes.length < 2) throw new Error('Tagged value must contain a complete DER TLV.');
  const firstLength = bytes[1];
  if ((firstLength & 0x80) === 0) return { contentOffset: 2 };
  const lengthBytes = firstLength & 0x7f;
  if (lengthBytes === 0) throw new Error('Indefinite length values cannot be implicitly retagged as DER.');
  if (bytes.length < 2 + lengthBytes) throw new Error('Tagged value has an incomplete DER length.');
  return { contentOffset: 2 + lengthBytes };
}

function encodeLength(length: number): Uint8Array {
  if (length < 0x80) return Uint8Array.of(length);
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Uint8Array.from([0x80 | bytes.length, ...bytes]);
}

function encodeBase128Arc(arc: number): number[] {
  if (arc === 0) return [0];
  const bytes: number[] = [];
  let remaining = arc;
  while (remaining > 0) {
    bytes.unshift(remaining & 0x7f);
    remaining >>= 7;
  }
  for (let index = 0; index < bytes.length - 1; index += 1) {
    bytes[index] |= 0x80;
  }
  return bytes;
}

function asciiBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 0x7f) throw new Error('This ASN.1 string type only accepts ASCII characters.');
    bytes[index] = code;
  }
  return bytes;
}

function compareDerLexicographically(left: Uint8Array, right: Uint8Array): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}
