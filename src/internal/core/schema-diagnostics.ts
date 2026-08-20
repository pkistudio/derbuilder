import type { Asn1Field, Asn1NamedNumber, Asn1SchemaModule, Asn1Type } from './schema-model.js';

export type SchemaDiagnosticSeverity = 'error' | 'warning';

export interface SchemaDiagnostic {
  severity: SchemaDiagnosticSeverity;
  code: string;
  message: string;
  path: string[];
}

export function validateSchemaModule(schemaModule: Asn1SchemaModule): SchemaDiagnostic[] {
  const diagnostics: SchemaDiagnostic[] = [];
  const typeNames = new Map<string, number>();

  for (const definition of schemaModule.types) {
    typeNames.set(definition.name, (typeNames.get(definition.name) ?? 0) + 1);
  }

  for (const [typeName, count] of typeNames) {
    if (count > 1) {
      diagnostics.push({ severity: 'error', code: 'duplicate-type', message: `Type "${typeName}" is defined more than once.`, path: ['types', typeName] });
    }
  }

  for (const definition of schemaModule.types) {
    validateType(schemaModule, definition.type, ['types', definition.name], diagnostics);
  }

  return diagnostics;
}

function validateType(schemaModule: Asn1SchemaModule, type: Asn1Type, path: string[], diagnostics: SchemaDiagnostic[]): void {
  switch (type.kind) {
    case 'defined':
      if (!schemaModule.types.some((definition) => definition.name === type.typeName)) {
        diagnostics.push({ severity: 'error', code: 'unknown-type', message: `Unknown type reference "${type.typeName}".`, path });
      }
      return;
    case 'tagged':
      if (type.tag.number < 0 || type.tag.number > 30 || !Number.isInteger(type.tag.number)) {
        diagnostics.push({ severity: 'error', code: 'unsupported-tag-number', message: `Tag number ${type.tag.number} is outside the supported low-form range 0..30.`, path });
      }
      validateType(schemaModule, type.type, [...path, 'tagged'], diagnostics);
      return;
    case 'sequence':
    case 'set':
      validateFields(schemaModule, type.fields, path, diagnostics);
      return;
    case 'choice':
      validateFields(schemaModule, type.alternatives, path, diagnostics);
      return;
    case 'sequenceOf':
    case 'setOf':
      validateType(schemaModule, type.elementType, [...path, 'elementType'], diagnostics);
      return;
    case 'integer':
      validateNamedNumbers(type.values ?? [], path, diagnostics);
      return;
    case 'enumerated':
      validateNamedNumbers(type.values, path, diagnostics);
      return;
    default:
      return;
  }
}

function validateFields(schemaModule: Asn1SchemaModule, fields: Asn1Field[], path: string[], diagnostics: SchemaDiagnostic[]): void {
  const fieldNames = new Map<string, number>();
  const tagNumbers = new Map<number, number>();

  for (const field of fields) {
    fieldNames.set(field.name, (fieldNames.get(field.name) ?? 0) + 1);
    if (field.type.kind === 'tagged' && field.type.tag.class === 'context') {
      tagNumbers.set(field.type.tag.number, (tagNumbers.get(field.type.tag.number) ?? 0) + 1);
    }
  }

  for (const [fieldName, count] of fieldNames) {
    if (count > 1) {
      diagnostics.push({ severity: 'error', code: 'duplicate-field', message: `Field "${fieldName}" is defined more than once.`, path: [...path, fieldName] });
    }
  }

  for (const [tagNumber, count] of tagNumbers) {
    if (count > 1) {
      diagnostics.push({ severity: 'error', code: 'duplicate-context-tag', message: `Context-specific tag [${tagNumber}] is used more than once in the same component list.`, path });
    }
  }

  for (const field of fields) {
    validateType(schemaModule, field.type, [...path, field.name], diagnostics);
  }
}

function validateNamedNumbers(values: Asn1NamedNumber[], path: string[], diagnostics: SchemaDiagnostic[]): void {
  const names = new Map<string, number>();
  const numbers = new Map<number, number>();

  for (const value of values) {
    names.set(value.name, (names.get(value.name) ?? 0) + 1);
    numbers.set(value.value, (numbers.get(value.value) ?? 0) + 1);
  }

  for (const [name, count] of names) {
    if (count > 1) {
      diagnostics.push({ severity: 'error', code: 'duplicate-named-number', message: `Named number "${name}" is defined more than once.`, path: [...path, name] });
    }
  }

  for (const [number, count] of numbers) {
    if (count > 1) {
      diagnostics.push({ severity: 'warning', code: 'duplicate-number-value', message: `Named number value ${number} is used more than once.`, path });
    }
  }
}
