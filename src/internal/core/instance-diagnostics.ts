import { normalizeBytes } from './bytes.js';
import { encodeValue, resolveDefinedType } from './instance-builder.js';
import { resolveObjectIdentifierName } from './oid-names.js';
import type { Asn1Field, Asn1SchemaModule, Asn1Type, ByteInput } from './schema-model.js';

export type InstanceDiagnosticSeverity = 'error' | 'warning';

export interface InstanceDiagnostic {
  severity: InstanceDiagnosticSeverity;
  code: string;
  message: string;
  path: string[];
}

export function validateInstance(schemaModule: Asn1SchemaModule, typeName: string, input: unknown): InstanceDiagnostic[] {
  try {
    const type = resolveDefinedType(schemaModule, typeName);
    return validateValue(schemaModule, type, input, []);
  } catch (error) {
    return [diagnosticFromError('unknown-type', error, [])];
  }
}

function validateValue(schemaModule: Asn1SchemaModule, type: Asn1Type, input: unknown, path: string[]): InstanceDiagnostic[] {
  switch (type.kind) {
    case 'defined':
      try {
        return validateValue(schemaModule, resolveDefinedType(schemaModule, type.typeName), input, path);
      } catch (error) {
        return [diagnosticFromError('unknown-type', error, path)];
      }
    case 'tagged':
      return validateValue(schemaModule, type.type, input, path);
    case 'sequence':
    case 'set':
      return validateFields(schemaModule, type.fields, input, path);
    case 'choice':
      return validateChoice(schemaModule, type.alternatives, input, path);
    case 'sequenceOf':
    case 'setOf':
      return validateArrayItems(schemaModule, type.elementType, input, path);
    default:
      return validateLeaf(schemaModule, type, input, path);
  }
}

function validateFields(schemaModule: Asn1SchemaModule, fields: Asn1Field[], input: unknown, path: string[]): InstanceDiagnostic[] {
  if (!isRecord(input)) {
    return [{ severity: 'error', code: 'expected-object', message: 'Constructed values expect an object.', path }];
  }

  const diagnostics: InstanceDiagnostic[] = [];
  const knownFields = new Set(fields.map((field) => field.name));

  for (const field of fields) {
    const value = input[field.name];
    if (value === undefined) {
      if (!field.optional && !('defaultValue' in field)) {
        diagnostics.push({ severity: 'error', code: 'missing-field', message: `Missing required field: ${field.name}.`, path: [...path, field.name] });
      }
      continue;
    }
    diagnostics.push(...validateValue(schemaModule, field.type, value, [...path, field.name]));
  }

  for (const key of Object.keys(input)) {
    if (!knownFields.has(key)) {
      diagnostics.push({ severity: 'warning', code: 'unknown-field', message: `Input field "${key}" is not defined by the selected ASN.1 type.`, path: [...path, key] });
    }
  }

  return diagnostics;
}

function validateChoice(schemaModule: Asn1SchemaModule, alternatives: Asn1Field[], input: unknown, path: string[]): InstanceDiagnostic[] {
  if (!isRecord(input) || typeof input.selected !== 'string' || !('value' in input)) {
    return [{ severity: 'error', code: 'expected-choice', message: 'CHOICE expects { selected, value }.', path }];
  }

  const alternative = alternatives.find((candidate) => candidate.name === input.selected);
  if (!alternative) {
    return [{ severity: 'error', code: 'unknown-choice', message: `Unknown CHOICE alternative: ${input.selected}.`, path: [...path, input.selected] }];
  }

  return validateValue(schemaModule, alternative.type, input.value, [...path, input.selected]);
}

function validateArrayItems(schemaModule: Asn1SchemaModule, elementType: Asn1Type, input: unknown, path: string[]): InstanceDiagnostic[] {
  if (!Array.isArray(input)) {
    return [{ severity: 'error', code: 'expected-array', message: 'SEQUENCE OF and SET OF expect an array.', path }];
  }

  return input.flatMap((item, index) => validateValue(schemaModule, elementType, item, [...path, String(index)]));
}

function validateLeaf(schemaModule: Asn1SchemaModule, type: Asn1Type, input: unknown, path: string[]): InstanceDiagnostic[] {
  const diagnostic = validateLeafShape(schemaModule, type, input, path);
  if (diagnostic) return [diagnostic];

  try {
    encodeValue(schemaModule, type, input);
    return [];
  } catch (error) {
    return [diagnosticFromError('invalid-value', error, path)];
  }
}

function validateLeafShape(schemaModule: Asn1SchemaModule, type: Asn1Type, input: unknown, path: string[]): InstanceDiagnostic | null {
  switch (type.kind) {
    case 'objectIdentifier':
      return validateObjectIdentifierInput(schemaModule, input, path);
    case 'bitString':
      return validateBitStringInput(input, path);
    case 'octetString':
      return validateByteInput(input, 'OCTET STRING', path);
    case 'utcTime':
      return validateTimeInput(input, 'utcTime', path);
    case 'generalizedTime':
      return validateTimeInput(input, 'generalizedTime', path);
    default:
      return null;
  }
}

function validateObjectIdentifierInput(schemaModule: Asn1SchemaModule, input: unknown, path: string[]): InstanceDiagnostic | null {
  if (typeof input !== 'string') {
    return { severity: 'error', code: 'invalid-object-identifier', message: 'OBJECT IDENTIFIER expects a dotted decimal string or known OID name.', path };
  }

  const resolved = resolveObjectIdentifierName(input, schemaModule.oidNames);
  if (!/^\d+(?:\.\d+)+$/.test(resolved)) {
    return { severity: 'error', code: 'invalid-object-identifier', message: `Unknown OID name or invalid dotted decimal OBJECT IDENTIFIER: ${input}.`, path };
  }

  const arcs = resolved.split('.').map((part) => Number.parseInt(part, 10));
  if (arcs.length < 2 || arcs.some((arc) => !Number.isInteger(arc) || arc < 0)) {
    return { severity: 'error', code: 'invalid-object-identifier', message: 'OBJECT IDENTIFIER must contain at least two non-negative decimal arcs.', path };
  }
  if (arcs[0] > 2 || (arcs[0] < 2 && arcs[1] > 39)) {
    return { severity: 'error', code: 'invalid-object-identifier', message: 'OBJECT IDENTIFIER has an invalid first or second arc.', path };
  }

  return null;
}

function validateBitStringInput(input: unknown, path: string[]): InstanceDiagnostic | null {
  if (isRecord(input) && 'bytes' in input) {
    const unusedBits = input.unusedBits;
    if (unusedBits !== undefined && (typeof unusedBits !== 'number' || !Number.isInteger(unusedBits) || unusedBits < 0 || unusedBits > 7)) {
      return { severity: 'error', code: 'invalid-bit-string', message: 'BIT STRING unused bits must be an integer between 0 and 7.', path: [...path, 'unusedBits'] };
    }
    const byteDiagnostic = validateByteInput(input.bytes, 'BIT STRING', [...path, 'bytes']);
    if (byteDiagnostic) return byteDiagnostic;
    if (unusedBits && normalizeBytes(input.bytes as ByteInput).length === 0) {
      return { severity: 'error', code: 'invalid-bit-string', message: 'BIT STRING unused bits must be 0 when the byte content is empty.', path: [...path, 'unusedBits'] };
    }
    return null;
  }

  return validateByteInput(input, 'BIT STRING', path);
}

function validateByteInput(input: unknown, typeName: string, path: string[]): InstanceDiagnostic | null {
  if (!isByteInputShape(input)) {
    return { severity: 'error', code: 'invalid-byte-input', message: `${typeName} expects HEX text, a number array, Uint8Array, or a { hex }, { utf8 }, or { base64 } object.`, path };
  }

  if (Array.isArray(input)) {
    const invalidIndex = input.findIndex((value) => typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255);
    if (invalidIndex >= 0) {
      return { severity: 'error', code: 'invalid-byte-value', message: 'Byte arrays must contain integers from 0 to 255.', path: [...path, String(invalidIndex)] };
    }
  }

  try {
    normalizeBytes(input);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.includes('Base64') ? 'invalid-base64' : message.includes('HEX') ? 'invalid-hex' : 'invalid-byte-input';
    return { severity: 'error', code, message, path };
  }
}

function validateTimeInput(input: unknown, kind: 'utcTime' | 'generalizedTime', path: string[]): InstanceDiagnostic | null {
  if (typeof input !== 'string') {
    return { severity: 'error', code: 'invalid-time', message: `${kind} expects a string.`, path };
  }

  const match = kind === 'utcTime' ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(input) : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(input);
  if (!match) {
    const shape = kind === 'utcTime' ? 'YYMMDDHHMMSSZ' : 'YYYYMMDDHHMMSSZ';
    return { severity: 'error', code: 'invalid-time', message: `${kind} expects DER time text in ${shape} form.`, path };
  }

  const offset = 2;
  const month = Number.parseInt(match[offset], 10);
  const day = Number.parseInt(match[offset + 1], 10);
  const hour = Number.parseInt(match[offset + 2], 10);
  const minute = Number.parseInt(match[offset + 3], 10);
  const second = Number.parseInt(match[offset + 4], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return { severity: 'error', code: 'invalid-time', message: `${kind} contains an out-of-range date or time component.`, path };
  }
  const year = kind === 'utcTime' ? utcYearToFullYear(Number.parseInt(match[1], 10)) : Number.parseInt(match[1], 10);
  if (day > daysInMonth(year, month)) {
    return { severity: 'error', code: 'invalid-time', message: `${kind} contains a calendar date that does not exist.`, path };
  }

  return null;
}

function utcYearToFullYear(year: number): number {
  return year >= 50 ? 1900 + year : 2000 + year;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function diagnosticFromError(code: string, error: unknown, path: string[]): InstanceDiagnostic {
  const message = error instanceof Error ? error.message.replace(/ at .+$/, '') : String(error);
  return { severity: 'error', code, message, path };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function isByteInputShape(input: unknown): input is ByteInput {
  return input instanceof Uint8Array ||
    Array.isArray(input) ||
    typeof input === 'string' ||
    (isRecord(input) && typeof input.hex === 'string') ||
    (isRecord(input) && typeof input.utf8 === 'string') ||
    (isRecord(input) && typeof input.base64 === 'string');
}
