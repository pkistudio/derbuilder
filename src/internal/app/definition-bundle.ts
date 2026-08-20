import type { Asn1SchemaModule } from '../../core.js';
import type { UiProfile } from './ui-profile.js';

export type DefinitionBundleDiagnosticSeverity = 'error' | 'warning';

export interface DefinitionBundleDiagnostic {
  severity: DefinitionBundleDiagnosticSeverity;
  code: string;
  message: string;
  path: string[];
}

export interface DefinitionBundleParseResult {
  bundle?: DefinitionBundle;
  diagnostics: DefinitionBundleDiagnostic[];
}

export type DefinitionBundleSchemaSource =
  | {
  /** Raw ASN.1 module text parsed into a Schema Model before building DER. */
      format: 'asn1';
      /** Optional display name for diagnostics and API log entries. */
      sourceName?: string;
      source: string;
    }
  | {
      /** Already parsed Schema Model for hosts that own parsing or store schema JSON directly. */
      format: 'schema-model';
      schema: Asn1SchemaModule;
    };

/** One loadable top-level type within a Definition Bundle. */
export interface DefinitionBundleEntry {
  [key: string]: unknown;
  /** Stable entry id for host menus or direct loadBundle selection. */
  id?: string;
  /** Top-level ASN.1 type name to select after loading the bundle schema. */
  typeName: string;
  label?: string;
  description?: string;
  /** Example Instance JSON loaded when the entry is selected. Takes precedence over defaultInput. */
  sampleInput?: unknown;
  /** Initial Instance JSON used when no sampleInput exists for the entry type. */
  defaultInput?: unknown;
  /** Optional form-rendering hints for this entry. UI metadata is not used for DER generation. */
  uiProfile?: UiProfile;
}

/**
 * Host-facing app package shape for schema, entries, sample inputs, and UI metadata.
 *
 * The Schema Model and Instance JSON remain the source of truth for diagnostics
 * and DER generation. Unknown bundle fields are ignored by the current helpers
 * so hosts can add private metadata without affecting app loading behavior.
 */
export interface DefinitionBundle {
  [key: string]: unknown;
  /** Globally unique bundle id, usually reverse-DNS style. */
  id: string;
  /** Bundle payload format version, independent from npm package version. */
  version: string;
  label: string;
  description?: string;
  schema: DefinitionBundleSchemaSource;
  entries: DefinitionBundleEntry[];
}

export function parseDefinitionBundleJson(source: string, sourceName = 'Definition Bundle JSON'): DefinitionBundle {
  const result = parseDefinitionBundleJsonWithDiagnostics(source);
  if (hasDefinitionBundleDiagnosticErrors(result.diagnostics)) {
    throw new Error(formatDefinitionBundleDiagnosticError(result.diagnostics, sourceName));
  }
  if (!result.bundle) throw new Error(`${sourceName} could not be parsed as a Definition Bundle.`);
  return result.bundle;
}

export function parseDefinitionBundleJsonWithDiagnostics(source: string): DefinitionBundleParseResult {
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch (error) {
    return { diagnostics: [{ severity: 'error', code: 'invalid-json', message: `Definition Bundle JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`, path: [] }] };
  }
  const diagnostics = validateDefinitionBundle(value);
  return hasDefinitionBundleDiagnosticErrors(diagnostics) ? { diagnostics } : { bundle: value as DefinitionBundle, diagnostics };
}

export function asDefinitionBundle(value: unknown, sourceName = 'Definition Bundle'): DefinitionBundle {
  const diagnostics = validateDefinitionBundle(value);
  if (hasDefinitionBundleDiagnosticErrors(diagnostics)) throw new Error(formatDefinitionBundleDiagnosticError(diagnostics, sourceName));
  return value as DefinitionBundle;
}

export function validateDefinitionBundle(value: unknown): DefinitionBundleDiagnostic[] {
  const diagnostics: DefinitionBundleDiagnostic[] = [];
  const bundle = validateRecord(value, [], diagnostics);
  if (!bundle) return diagnostics;
  validateString(bundle.id, ['id'], diagnostics, true);
  validateString(bundle.version, ['version'], diagnostics, true);
  validateString(bundle.label, ['label'], diagnostics, true);
  validateString(bundle.description, ['description'], diagnostics, false);
  validateDefinitionBundleSchemaSource(bundle.schema, ['schema'], diagnostics);
  if (!Array.isArray(bundle.entries)) {
    diagnostics.push({ severity: 'error', code: 'expected-array', message: 'Definition Bundle entries must be an array.', path: ['entries'] });
  } else if (bundle.entries.length === 0) {
    diagnostics.push({ severity: 'error', code: 'missing-entry', message: 'Definition Bundle entries must contain at least one entry.', path: ['entries'] });
  } else {
    bundle.entries.forEach((entry, index) => validateDefinitionBundleEntry(entry, ['entries', String(index)], diagnostics));
  }
  return diagnostics;
}

export function findDefinitionBundleEntry(bundle: DefinitionBundle, idOrTypeName: string): DefinitionBundleEntry | undefined {
  return bundle.entries.find((entry) => entry.id === idOrTypeName) ?? bundle.entries.find((entry) => entry.typeName === idOrTypeName);
}

export function getDefinitionBundleSampleInputs(bundle: DefinitionBundle): Record<string, unknown> {
  const sampleInputs: Record<string, unknown> = {};
  for (const entry of bundle.entries) {
    if ('sampleInput' in entry && !Object.prototype.hasOwnProperty.call(sampleInputs, entry.typeName)) {
      sampleInputs[entry.typeName] = entry.sampleInput;
    } else if ('defaultInput' in entry && !Object.prototype.hasOwnProperty.call(sampleInputs, entry.typeName)) {
      sampleInputs[entry.typeName] = entry.defaultInput;
    }
  }
  return sampleInputs;
}

export function getDefinitionBundleUiProfiles(bundle: DefinitionBundle): Record<string, UiProfile> {
  const uiProfiles: Record<string, UiProfile> = {};
  for (const entry of bundle.entries) {
    if (entry.uiProfile && !Object.prototype.hasOwnProperty.call(uiProfiles, entry.typeName)) {
      uiProfiles[entry.typeName] = entry.uiProfile;
    }
  }
  return uiProfiles;
}

export function isRawAsn1BundleSchemaSource(source: DefinitionBundleSchemaSource): source is Extract<DefinitionBundleSchemaSource, { format: 'asn1' }> {
  return source.format === 'asn1';
}

export function isSchemaModelBundleSchemaSource(source: DefinitionBundleSchemaSource): source is Extract<DefinitionBundleSchemaSource, { format: 'schema-model' }> {
  return source.format === 'schema-model';
}

function validateDefinitionBundleSchemaSource(value: unknown, path: string[], diagnostics: DefinitionBundleDiagnostic[]): void {
  const source = validateRecord(value, path, diagnostics);
  if (!source) return;
  const format = validateString(source.format, [...path, 'format'], diagnostics, true);
  if (format === 'asn1') {
    validateString(source.sourceName, [...path, 'sourceName'], diagnostics, false);
    validateString(source.source, [...path, 'source'], diagnostics, true);
  } else if (format === 'schema-model') {
    validateRecord(source.schema, [...path, 'schema'], diagnostics);
  } else if (format !== undefined) {
    diagnostics.push({ severity: 'error', code: 'invalid-schema-format', message: 'Definition Bundle schema format must be "asn1" or "schema-model".', path: [...path, 'format'] });
  }
}

function validateDefinitionBundleEntry(value: unknown, path: string[], diagnostics: DefinitionBundleDiagnostic[]): void {
  const entry = validateRecord(value, path, diagnostics);
  if (!entry) return;
  validateString(entry.id, [...path, 'id'], diagnostics, false);
  validateString(entry.typeName, [...path, 'typeName'], diagnostics, true);
  validateString(entry.label, [...path, 'label'], diagnostics, false);
  validateString(entry.description, [...path, 'description'], diagnostics, false);
  if (entry.uiProfile !== undefined) validateRecord(entry.uiProfile, [...path, 'uiProfile'], diagnostics);
}

function validateRecord(value: unknown, path: string[], diagnostics: DefinitionBundleDiagnostic[]): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    diagnostics.push({ severity: 'error', code: 'expected-object', message: 'Definition Bundle values must be JSON objects at this path.', path });
    return undefined;
  }
  return value as Record<string, unknown>;
}

function validateString(value: unknown, path: string[], diagnostics: DefinitionBundleDiagnostic[], required: boolean): string | undefined {
  if (value === undefined) {
    if (required) diagnostics.push({ severity: 'error', code: 'missing-string', message: 'Definition Bundle field must be a non-empty string.', path });
    return undefined;
  }
  if (typeof value !== 'string' || value.length === 0) {
    diagnostics.push({ severity: 'error', code: 'invalid-string', message: 'Definition Bundle field must be a non-empty string.', path });
    return undefined;
  }
  return value;
}

function hasDefinitionBundleDiagnosticErrors(diagnostics: DefinitionBundleDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

function formatDefinitionBundleDiagnosticError(diagnostics: DefinitionBundleDiagnostic[], sourceName: string): string {
  const firstError = diagnostics.find((diagnostic) => diagnostic.severity === 'error') ?? diagnostics[0];
  if (!firstError) return `${sourceName} has no diagnostics.`;
  const path = firstError.path.length > 0 ? ` at ${firstError.path.join('.')}` : '';
  return `${sourceName} ${firstError.code}${path}: ${firstError.message}`;
}
