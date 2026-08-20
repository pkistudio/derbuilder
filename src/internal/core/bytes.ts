import type { ByteInput } from './schema-model.js';

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function hexToBytes(input: string): Uint8Array {
  const normalized = input.replace(/[\s:_-]/g, '');
  if (/[^0-9a-f]/i.test(normalized)) {
    throw new Error('HEX input contains non-hexadecimal characters.');
  }
  if (normalized.length % 2 !== 0) {
    throw new Error('HEX input must contain an even number of digits.');
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function utf8ToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

export function base64ToBytes(input: string): Uint8Array {
  const normalized = input.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new Error('Base64 input is not valid.');
  }
  const binary = globalThis.atob ? globalThis.atob(normalized) : Buffer.from(normalized, 'base64').toString('binary');
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function normalizeBytes(input: ByteInput): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (Array.isArray(input)) return Uint8Array.from(input);
  if (typeof input === 'string') return hexToBytes(input);
  if ('hex' in input) return hexToBytes(input.hex);
  if ('utf8' in input) return utf8ToBytes(input.utf8);
  return base64ToBytes(input.base64);
}
