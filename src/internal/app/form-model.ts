import { resolveDefinedType } from '../../core.js';
import type { Asn1Field, Asn1SchemaModule, Asn1Type } from '../../core.js';

export type FormPathSegment = string | number;
export type JsonObject = Record<string, unknown>;

export function createDefaultInput(schemaModule: Asn1SchemaModule, type: Asn1Type): unknown {
  const resolved = resolveEditableType(schemaModule, type);
  switch (resolved.kind) {
    case 'boolean':
      return false;
    case 'integer':
      return resolved.values?.[0]?.name ?? 0;
    case 'enumerated':
      return resolved.values[0]?.name ?? 0;
    case 'bitString':
      return { bytes: { hex: '' }, unusedBits: 0 };
    case 'octetString':
      return { hex: '' };
    case 'null':
      return null;
    case 'objectIdentifier':
    case 'utf8String':
    case 'printableString':
    case 'ia5String':
    case 'utcTime':
    case 'generalizedTime':
      return '';
    case 'sequence':
    case 'set': {
      const record: JsonObject = {};
      for (const field of resolved.fields) {
        if (field.optional || 'defaultValue' in field) continue;
        record[field.name] = createDefaultInput(schemaModule, field.type);
      }
      return record;
    }
    case 'choice': {
      const selected = resolved.alternatives[0];
      return selected ? { selected: selected.name, value: createDefaultInput(schemaModule, selected.type) } : { selected: '', value: null };
    }
    case 'sequenceOf':
    case 'setOf':
      return [];
  }
}

export function resolveEditableType(schemaModule: Asn1SchemaModule, type: Asn1Type): Asn1Type {
  if (type.kind === 'defined') return resolveEditableType(schemaModule, resolveDefinedType(schemaModule, type.typeName));
  if (type.kind === 'tagged') return resolveEditableType(schemaModule, type.type);
  return type;
}

export function findChoiceAlternative(schemaModule: Asn1SchemaModule, type: Asn1Type, selected: string): Asn1Field | undefined {
  const resolved = resolveEditableType(schemaModule, type);
  return resolved.kind === 'choice' ? resolved.alternatives.find((alternative) => alternative.name === selected) : undefined;
}

export function stringifyFormPath(path: FormPathSegment[]): string {
  return JSON.stringify(path);
}

export function parseFormPath(value: string): FormPathSegment[] {
  const parsed = JSON.parse(value) as FormPathSegment[];
  return Array.isArray(parsed) ? parsed : [];
}

export function getValueAtPath(root: unknown, path: FormPathSegment[]): unknown {
  let current = root;
  for (const segment of path) {
    if (Array.isArray(current) && typeof segment === 'number') current = current[segment];
    else if (isPlainObject(current) && typeof segment === 'string') current = current[segment];
    else return undefined;
  }
  return current;
}

export function setValueAtPath(root: unknown, path: FormPathSegment[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...tail] = path;
  if (typeof head === 'number') {
    const next = Array.isArray(root) ? [...root] : [];
    next[head] = setValueAtPath(next[head], tail, value);
    return next;
  }
  const next: JsonObject = isPlainObject(root) ? { ...root } : {};
  next[head] = setValueAtPath(next[head], tail, value);
  return next;
}

export function setFormControlValue(root: unknown, path: FormPathSegment[], value: unknown): unknown {
  if (path[path.length - 1] === 'unusedBits') {
    const parentPath = path.slice(0, -1);
    const parentValue = getValueAtPath(root, parentPath);
    if (!isPlainObject(parentValue) || !('bytes' in parentValue)) {
      return setValueAtPath(root, parentPath, { bytes: parentValue ?? { hex: '' }, unusedBits: value });
    }
  }
  return setValueAtPath(root, path, value);
}

export function removeValueAtPath(root: unknown, path: FormPathSegment[]): unknown {
  if (path.length === 0) return undefined;
  const [head, ...tail] = path;
  if (typeof head === 'number') {
    const next = Array.isArray(root) ? [...root] : [];
    if (tail.length === 0) next.splice(head, 1);
    else next[head] = removeValueAtPath(next[head], tail);
    return next;
  }
  const next: JsonObject = isPlainObject(root) ? { ...root } : {};
  if (tail.length === 0) delete next[head];
  else next[head] = removeValueAtPath(next[head], tail);
  return next;
}

export function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
