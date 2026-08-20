import type { FormPathSegment } from './form-model.js';

export type UiFieldPath = string | readonly FormPathSegment[];

export type UiProfileInputMode = 'text' | 'hex' | 'base64' | 'utf8' | 'datetime' | 'oid';

export type UiProfileWidget =
  | 'text'
  | 'textarea'
  | 'integer'
  | 'boolean'
  | 'select'
  | 'choice'
  | 'bytes'
  | 'bitString'
  | 'objectIdentifier'
  | 'dateTime';

export interface UiFieldProfile {
  /** Display label for the generated form field. */
  label?: string;
  /** Short help text shown near the generated form field or group. */
  description?: string;
  /** Preferred widget for the field when the renderer supports it. */
  widget?: UiProfileWidget;
  placeholder?: string;
  /** UI hint for form initialization only; DER generation uses Instance JSON. */
  defaultInput?: unknown;
  /** Hide the field from the generated form while keeping JSON editing available. */
  hidden?: boolean;
  /** Render a constructed field group collapsed by default when supported. */
  collapsed?: boolean;
  /** Sort key for fields within the same constructed parent. */
  order?: number;
  /** Preferred text encoding or semantic input mode for compatible widgets. */
  inputMode?: UiProfileInputMode;
}

/**
 * Optional input-experience metadata for one top-level ASN.1 type.
 *
 * UI Profiles decorate generated forms but do not change schema validation,
 * instance validation, or DER generation. Field keys use normalized form paths,
 * such as "subject.name" or "extensions.0.extnValue". Repeated item templates
 * may use "*" for numeric array indexes, such as "extensions.*.extnValue".
 */
export interface UiProfile {
  id: string;
  typeName: string;
  /** Field profiles keyed by normalized form paths such as "subject.name", "extensions.0.extnValue", or "extensions.*.extnValue". */
  fields?: Record<string, UiFieldProfile>;
}

export function normalizeUiFieldPath(path: UiFieldPath): string {
  if (typeof path === 'string') return path.trim();
  return path.map((segment) => String(segment)).join('.');
}

export function getUiFieldProfile(profile: UiProfile | undefined, path: UiFieldPath): UiFieldProfile | undefined {
  if (!profile?.fields) return undefined;
  const normalizedPath = normalizeUiFieldPath(path);
  return profile.fields[normalizedPath] ?? profile.fields[normalizeUiFieldTemplatePath(path)];
}

function normalizeUiFieldTemplatePath(path: UiFieldPath): string {
  const normalizedPath = normalizeUiFieldPath(path);
  if (typeof path === 'string') return normalizedPath.split('.').map((segment) => isArrayIndexSegment(segment) ? '*' : segment).join('.');
  return path.map((segment) => typeof segment === 'number' ? '*' : String(segment)).join('.');
}

function isArrayIndexSegment(segment: string): boolean {
  return /^(0|[1-9]\d*)$/.test(segment);
}
