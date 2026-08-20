import { normalizeBytes } from './bytes.js';
import { encodeBitString, encodeBoolean, encodeEnumerated, encodeExplicitContextSpecificTag, encodeImplicitContextSpecificTag, encodeInteger, encodeNull, encodeObjectIdentifier, encodeOctetString, encodeSequence, encodeSet, encodeText } from './der.js';
import { DerBuilderError, withPath } from './errors.js';
import { resolveObjectIdentifierName } from './oid-names.js';
import type { Asn1Field, Asn1SchemaModule, Asn1Type, BitStringInput, ByteInput, ChoiceInput, InstanceDocument } from './schema-model.js';

export function createInstance(schemaModule: Asn1SchemaModule, typeName: string, input: unknown): InstanceDocument {
  const type = resolveDefinedType(schemaModule, typeName);
  return {
    moduleName: schemaModule.name,
    typeName,
    der: encodeValue(schemaModule, type, input)
  };
}

export function encodeValue(schemaModule: Asn1SchemaModule, type: Asn1Type, input: unknown): Uint8Array {
  switch (type.kind) {
    case 'tagged':
      return encodeTaggedValue(schemaModule, type, input);
    case 'enumerated':
      return encodeEnumerated(resolveEnumeratedInput(type, input));
    case 'boolean':
      if (typeof input !== 'boolean') throw new DerBuilderError('BOOLEAN expects a boolean value.');
      return encodeBoolean(input);
    case 'integer':
      return encodeInteger(resolveIntegerInput(type, input));
    case 'bitString':
      return encodeBitStringInput(input);
    case 'octetString':
      return encodeOctetString(normalizeBytesInput(input, 'OCTET STRING'));
    case 'null':
      if (input !== null) throw new DerBuilderError('NULL expects null.');
      return encodeNull();
    case 'objectIdentifier':
      if (typeof input !== 'string') throw new DerBuilderError('OBJECT IDENTIFIER expects a dotted decimal string.');
      return encodeObjectIdentifier(resolveObjectIdentifierName(input, schemaModule.oidNames));
    case 'utf8String':
    case 'printableString':
    case 'ia5String':
    case 'utcTime':
    case 'generalizedTime':
      if (typeof input !== 'string') throw new DerBuilderError(`${type.kind} expects a string.`);
      return encodeText(type.kind, input);
    case 'sequence':
      return encodeSequence(encodeFields(schemaModule, type.fields, input));
    case 'set':
      return encodeSet(encodeFields(schemaModule, type.fields, input));
    case 'choice':
      return encodeChoice(schemaModule, type.alternatives, input);
    case 'sequenceOf':
      return encodeSequence(encodeArrayItems(schemaModule, type.elementType, input));
    case 'setOf':
      return encodeSet(encodeArrayItems(schemaModule, type.elementType, input));
    case 'defined':
      return encodeValue(schemaModule, resolveDefinedType(schemaModule, type.typeName), input);
  }
}

function encodeTaggedValue(schemaModule: Asn1SchemaModule, type: Extract<Asn1Type, { kind: 'tagged' }>, input: unknown): Uint8Array {
  const inner = encodeValue(schemaModule, type.type, input);
  if (type.tag.class !== 'context') throw new DerBuilderError('Only context-specific tags are supported.');
  return type.tag.mode === 'explicit' ? encodeExplicitContextSpecificTag(type.tag.number, inner) : encodeImplicitContextSpecificTag(type.tag.number, inner);
}

export function resolveDefinedType(schemaModule: Asn1SchemaModule, typeName: string): Asn1Type {
  const definition = schemaModule.types.find((candidate) => candidate.name === typeName);
  if (!definition) throw new DerBuilderError(`Unknown ASN.1 type: ${typeName}.`);
  return definition.type;
}

function encodeFields(schemaModule: Asn1SchemaModule, fields: Asn1Field[], input: unknown): Uint8Array[] {
  if (!isRecord(input)) throw new DerBuilderError('Constructed values expect an object.');
  const encoded: Uint8Array[] = [];
  for (const field of fields) {
    const value = input[field.name];
    if (value === undefined) {
      if ('defaultValue' in field) continue;
      if (field.optional) continue;
      throw new DerBuilderError(`Missing required field: ${field.name}.`);
    }
    if ('defaultValue' in field && fieldValueEqualsDefault(schemaModule, field.type, value, field.defaultValue)) continue;
    try {
      encoded.push(encodeValue(schemaModule, field.type, value));
    } catch (error) {
      withPath(error, field.name);
    }
  }
  return encoded;
}

function resolveIntegerInput(type: Extract<Asn1Type, { kind: 'integer' }>, input: unknown): bigint | number | string {
  if (typeof input === 'bigint') return input;
  if (typeof input === 'number' && Number.isInteger(input)) return input;
  if (typeof input === 'string') {
    const named = type.values?.find((candidate) => candidate.name === input);
    if (named) return named.value;
    if (/^-?\d+$/.test(input)) return input;
  }
  throw new DerBuilderError('INTEGER expects a named value, number, bigint, or decimal string.');
}

function resolveEnumeratedInput(type: Extract<Asn1Type, { kind: 'enumerated' }>, input: unknown): number {
  if (typeof input === 'number' && Number.isInteger(input)) return input;
  if (typeof input === 'string') {
    const named = type.values.find((candidate) => candidate.name === input);
    if (named) return named.value;
    if (/^\d+$/.test(input)) return Number.parseInt(input, 10);
  }
  throw new DerBuilderError('ENUMERATED expects a named value or integer value.');
}

function fieldValueEqualsDefault(schemaModule: Asn1SchemaModule, type: Asn1Type, value: unknown, defaultValue: unknown): boolean {
  const resolvedType = resolveTypeForDefault(schemaModule, type);
  try {
    if (resolvedType.kind === 'integer') {
      return BigInt(resolveIntegerInput(resolvedType, value)) === BigInt(resolveIntegerInput(resolvedType, defaultValue));
    }
    if (resolvedType.kind === 'enumerated') {
      return resolveEnumeratedInput(resolvedType, value) === resolveEnumeratedInput(resolvedType, defaultValue);
    }
  } catch {
    return false;
  }
  return JSON.stringify(value) === JSON.stringify(defaultValue);
}

function resolveTypeForDefault(schemaModule: Asn1SchemaModule, type: Asn1Type): Asn1Type {
  if (type.kind === 'tagged') return resolveTypeForDefault(schemaModule, type.type);
  if (type.kind === 'defined') return resolveTypeForDefault(schemaModule, resolveDefinedType(schemaModule, type.typeName));
  return type;
}

function encodeChoice(schemaModule: Asn1SchemaModule, alternatives: Asn1Field[], input: unknown): Uint8Array {
  if (!isChoiceInput(input)) throw new DerBuilderError('CHOICE expects { selected, value }.');
  const alternative = alternatives.find((candidate) => candidate.name === input.selected);
  if (!alternative) throw new DerBuilderError(`Unknown CHOICE alternative: ${input.selected}.`);
  try {
    return encodeValue(schemaModule, alternative.type, input.value);
  } catch (error) {
    withPath(error, input.selected);
  }
}

function encodeArrayItems(schemaModule: Asn1SchemaModule, elementType: Asn1Type, input: unknown): Uint8Array[] {
  if (!Array.isArray(input)) throw new DerBuilderError('SEQUENCE OF and SET OF expect an array.');
  return input.map((item, index) => {
    try {
      return encodeValue(schemaModule, elementType, item);
    } catch (error) {
      withPath(error, String(index));
    }
  });
}

function encodeBitStringInput(input: unknown): Uint8Array {
  if (isBitStringInput(input)) {
    return encodeBitString(normalizeBytes(input.bytes), input.unusedBits ?? 0);
  }
  return encodeBitString(normalizeBytesInput(input, 'BIT STRING'));
}

function normalizeBytesInput(input: unknown, typeName: string): Uint8Array {
  if (isByteInput(input)) {
    return normalizeBytes(input);
  }
  throw new DerBuilderError(`${typeName} expects HEX text, a number array, Uint8Array, or a { hex }, { utf8 }, or { base64 } object.`);
}

function isByteInput(input: unknown): input is ByteInput {
  return input instanceof Uint8Array ||
    Array.isArray(input) ||
    typeof input === 'string' ||
    (isRecord(input) && typeof input.hex === 'string') ||
    (isRecord(input) && typeof input.utf8 === 'string') ||
    (isRecord(input) && typeof input.base64 === 'string');
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function isChoiceInput(input: unknown): input is ChoiceInput {
  return isRecord(input) && typeof input.selected === 'string' && 'value' in input;
}

function isBitStringInput(input: unknown): input is BitStringInput {
  return isRecord(input) && 'bytes' in input;
}
