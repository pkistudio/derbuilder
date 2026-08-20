import { createDefaultInput, isPlainObject, resolveEditableType, stringifyFormPath, type FormPathSegment } from './form-model.js';
import { getUiFieldProfile, type UiFieldProfile, type UiProfile, type UiProfileInputMode } from './ui-profile.js';
import type { Asn1Field, Asn1NamedNumber, Asn1SchemaModule, Asn1Type, InstanceDiagnostic } from '../../core.js';

export type InputMode = 'form' | 'json';

interface RenderContext {
  schemaModule: Asn1SchemaModule;
  diagnostics: InstanceDiagnostic[];
  uiProfile?: UiProfile;
}

export function updateInputModeButtons(buttons: HTMLButtonElement[], mode: InputMode): void {
  for (const button of buttons) {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
  }
}

export function renderInputForm(container: HTMLElement, schemaModule: Asn1SchemaModule, type: Asn1Type, value: unknown, diagnostics: InstanceDiagnostic[], uiProfile?: UiProfile): void {
  container.innerHTML = '';
  container.append(renderValueEditor({ schemaModule, diagnostics, uiProfile }, type, value, [], 'Value'));
}

export function readFormControlValue(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): unknown {
  if (control.dataset.valueKind === 'boolean' && control instanceof HTMLInputElement) return control.checked;
  if (control.dataset.valueKind === 'number') return Number.parseInt(control.value || '0', 10);
  if (control.dataset.valueKind === 'null') return null;
  return control.value;
}

function renderValueEditor(context: RenderContext, type: Asn1Type, value: unknown, path: FormPathSegment[], label: string): HTMLElement {
  const fieldProfile = getUiFieldProfile(context.uiProfile, path);
  if (fieldProfile?.hidden) return renderHiddenField();
  const resolved = resolveEditableType(context.schemaModule, type);
  const displayLabel = fieldProfile?.label ?? label;
  switch (resolved.kind) {
    case 'sequence':
    case 'set':
      return renderFieldGroup(context, resolved.fields, value, path, displayLabel);
    case 'choice':
      return renderChoiceEditor(context, resolved, value, path, displayLabel);
    case 'sequenceOf':
    case 'setOf':
      return renderArrayEditor(context, resolved.elementType, value, path, displayLabel);
    case 'bitString':
      return renderBitStringEditor(context, value, path, displayLabel);
    case 'octetString':
      return renderByteEditor(context, value, path, displayLabel, 'OCTET STRING');
    default:
      return renderPrimitiveEditor(context, resolved, value, path, displayLabel);
  }
}

function renderFieldGroup(context: RenderContext, fields: Asn1Field[], value: unknown, path: FormPathSegment[], label: string): HTMLElement {
  const group = document.createElement('section');
  group.className = 'derbuilder-form-group';
  group.append(renderFormLegend(label));
  appendProfileDescription(group, getUiFieldProfile(context.uiProfile, path));
  const objectValue = isPlainObject(value) ? value : {};

  for (const field of sortFieldsByProfileOrder(fields, path, context.uiProfile)) {
    const fieldPath = [...path, field.name];
    const fieldProfile = getUiFieldProfile(context.uiProfile, fieldPath);
    if (fieldProfile?.hidden) continue;
    const fieldLabel = fieldProfile?.label ?? field.name;
    const hasValue = Object.prototype.hasOwnProperty.call(objectValue, field.name);
    const row = document.createElement('section');
    row.className = 'derbuilder-form-field';

    const header = document.createElement('div');
    header.className = 'derbuilder-form-field-header';
    const title = document.createElement('span');
    title.textContent = fieldLabel;
    header.append(title);

    if (field.optional || 'defaultValue' in field) {
      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'derbuilder-form-toggle';
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = hasValue;
      toggle.dataset.action = 'toggle-field';
      toggle.dataset.path = stringifyFormPath(fieldPath);
      toggle.dataset.fieldType = JSON.stringify(field.type);
      toggleLabel.append(toggle, document.createTextNode('Set'));
      header.append(toggleLabel);
    }
    row.append(header);
    appendProfileDescription(row, fieldProfile);

    const fieldBody = hasValue || (!field.optional && !('defaultValue' in field))
      ? renderValueEditor(context, field.type, objectValue[field.name], fieldPath, field.name)
      : renderFormHint('defaultValue' in field ? 'Using ASN.1 DEFAULT value.' : 'Optional field omitted.');
    row.append(fieldProfile?.collapsed ? renderCollapsedFieldBody(fieldLabel, fieldBody) : fieldBody);
    appendFieldDiagnostics(row, context.diagnostics, fieldPath);
    group.append(row);
  }

  appendFieldDiagnostics(group, context.diagnostics, path);
  return group;
}

function renderChoiceEditor(context: RenderContext, type: Extract<Asn1Type, { kind: 'choice' }>, value: unknown, path: FormPathSegment[], label: string): HTMLElement {
  const wrapper = document.createElement('section');
  wrapper.className = 'derbuilder-form-choice';
  wrapper.append(renderFormLegend(label));
  appendProfileDescription(wrapper, getUiFieldProfile(context.uiProfile, path));
  const choiceValue = isPlainObject(value) ? value : { selected: type.alternatives[0]?.name, value: undefined };
  const selectedName = typeof choiceValue.selected === 'string' ? choiceValue.selected : type.alternatives[0]?.name ?? '';
  const selected = type.alternatives.find((alternative) => alternative.name === selectedName) ?? type.alternatives[0];

  const selectRow = document.createElement('label');
  selectRow.className = 'derbuilder-form-control-row';
  const selectLabel = document.createElement('span');
  selectLabel.textContent = 'Alternative';
  const select = document.createElement('select');
  select.dataset.action = 'choice-selected';
  select.dataset.path = stringifyFormPath(path);
  select.dataset.choiceType = JSON.stringify(type);
  for (const alternative of type.alternatives) {
    const option = document.createElement('option');
    option.value = alternative.name;
    option.textContent = alternative.name;
    select.append(option);
  }
  select.value = selected?.name ?? '';
  selectRow.append(selectLabel, select);
  wrapper.append(selectRow);

  if (selected) {
    const nestedValue = selectedName === choiceValue.selected && 'value' in choiceValue ? choiceValue.value : createDefaultInput(context.schemaModule, selected.type);
    wrapper.append(renderValueEditor(context, selected.type, nestedValue, [...path, 'value'], selected.name));
  }
  appendFieldDiagnostics(wrapper, context.diagnostics, path);
  return wrapper;
}

function renderArrayEditor(context: RenderContext, elementType: Asn1Type, value: unknown, path: FormPathSegment[], label: string): HTMLElement {
  const wrapper = document.createElement('section');
  wrapper.className = 'derbuilder-form-array';
  const header = document.createElement('div');
  header.className = 'derbuilder-form-array-header';
  header.append(renderFormLegend(label));
  appendProfileDescription(wrapper, getUiFieldProfile(context.uiProfile, path));
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.textContent = 'Add';
  addButton.dataset.action = 'add-item';
  addButton.dataset.path = stringifyFormPath(path);
  addButton.dataset.itemType = JSON.stringify(elementType);
  header.append(addButton);
  wrapper.append(header);

  const items = Array.isArray(value) ? value : [];
  if (items.length === 0) wrapper.append(renderFormHint('No items.'));
  items.forEach((item, index) => {
    const itemSection = document.createElement('section');
    itemSection.className = 'derbuilder-form-array-item';
    const itemHeader = document.createElement('div');
    itemHeader.className = 'derbuilder-form-array-item-header';
    const itemTitle = document.createElement('span');
    itemTitle.textContent = `Item ${index + 1}`;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.dataset.action = 'remove-item';
    removeButton.dataset.path = stringifyFormPath(path);
    removeButton.dataset.index = String(index);
    itemHeader.append(itemTitle, removeButton);
    itemSection.append(itemHeader, renderValueEditor(context, elementType, item, [...path, index], `Item ${index + 1}`));
    wrapper.append(itemSection);
  });
  appendFieldDiagnostics(wrapper, context.diagnostics, path);
  return wrapper;
}

function renderBitStringEditor(context: RenderContext, value: unknown, path: FormPathSegment[], label: string): HTMLElement {
  const wrapper = document.createElement('section');
  wrapper.className = 'derbuilder-form-byte-compound';
  wrapper.append(renderFormLegend(label));
  appendProfileDescription(wrapper, getUiFieldProfile(context.uiProfile, path));
  const bitStringValue = isPlainObject(value) && 'bytes' in value ? value : { bytes: value ?? { hex: '' }, unusedBits: 0 };
  wrapper.append(renderByteEditor(context, bitStringValue.bytes, [...path, 'bytes'], 'Bytes', 'BIT STRING'));
  wrapper.append(renderNumberControl(bitStringValue.unusedBits ?? 0, [...path, 'unusedBits'], 'Unused bits', 0, 7));
  appendFieldDiagnostics(wrapper, context.diagnostics, path);
  return wrapper;
}

function renderByteEditor(context: RenderContext, value: unknown, path: FormPathSegment[], label: string, typeLabel: string): HTMLElement {
  const wrapper = document.createElement('section');
  wrapper.className = 'derbuilder-form-byte-editor';
  wrapper.append(renderFormLegend(label));
  const fieldProfile = getUiFieldProfile(context.uiProfile, path);
  appendProfileDescription(wrapper, fieldProfile);
  const mode = getByteMode(value, fieldProfile?.inputMode);
  const content = getByteContent(value, mode);

  const modeRow = document.createElement('label');
  modeRow.className = 'derbuilder-form-control-row';
  const modeLabel = document.createElement('span');
  modeLabel.textContent = `${typeLabel} mode`;
  const select = document.createElement('select');
  select.dataset.action = 'byte-mode';
  select.dataset.path = stringifyFormPath(path);
  for (const optionValue of ['hex', 'utf8', 'base64']) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    select.append(option);
  }
  select.value = mode;
  modeRow.append(modeLabel, select);

  const inputRow = document.createElement('label');
  inputRow.className = 'derbuilder-form-control-row';
  const inputLabel = document.createElement('span');
  inputLabel.textContent = mode;
  const input = document.createElement('textarea');
  input.rows = 2;
  input.value = content;
  if (fieldProfile?.placeholder) input.placeholder = fieldProfile.placeholder;
  input.dataset.path = stringifyFormPath([...path, mode]);
  input.dataset.valueKind = 'string';
  inputRow.append(inputLabel, input);
  wrapper.append(modeRow, inputRow);
  appendFieldDiagnostics(wrapper, context.diagnostics, path);
  return wrapper;
}

function renderPrimitiveEditor(context: RenderContext, type: Asn1Type, value: unknown, path: FormPathSegment[], label: string): HTMLElement {
  const fieldProfile = getUiFieldProfile(context.uiProfile, path);
  if (type.kind === 'boolean') return renderCheckboxControl(value === true, path, label, context.diagnostics, fieldProfile);
  if (type.kind === 'integer') {
    if (type.values && type.values.length > 0) return renderNamedNumberSelect(type.values, value, path, label, context.diagnostics, fieldProfile);
    return renderNumberControl(value, path, label, undefined, undefined, fieldProfile);
  }
  if (type.kind === 'enumerated') return renderNamedNumberSelect(type.values, value, path, label, context.diagnostics, fieldProfile);
  if (type.kind === 'null') return renderNullControl(path, label, context.diagnostics, fieldProfile);
  const suggestions = type.kind === 'objectIdentifier' ? Object.keys(context.schemaModule.oidNames ?? {}) : [];
  return renderTextControl(typeof value === 'string' ? value : '', path, label, type.kind, context.diagnostics, suggestions, fieldProfile);
}

function renderTextControl(value: string, path: FormPathSegment[], label: string, kind: string, diagnostics: InstanceDiagnostic[], suggestions: string[] = [], fieldProfile?: UiFieldProfile): HTMLElement {
  const row = document.createElement('label');
  row.className = 'derbuilder-form-control-row';
  const text = document.createElement('span');
  text.textContent = label;
  const input = fieldProfile?.widget === 'textarea' ? document.createElement('textarea') : document.createElement('input');
  if (input instanceof HTMLInputElement) input.type = fieldProfile?.inputMode === 'datetime' ? 'datetime-local' : 'text';
  input.value = value;
  input.placeholder = fieldProfile?.placeholder ?? kind;
  input.dataset.path = stringifyFormPath(path);
  input.dataset.valueKind = 'string';
  if (suggestions.length > 0) {
    const listId = `derbuilder-oid-${Math.random().toString(16).slice(2)}`;
    input.setAttribute('list', listId);
    const list = document.createElement('datalist');
    list.id = listId;
    for (const suggestion of suggestions) {
      const option = document.createElement('option');
      option.value = suggestion;
      list.append(option);
    }
    row.append(text, input, list);
  } else {
    row.append(text, input);
  }
  appendProfileDescription(row, fieldProfile);
  appendFieldDiagnostics(row, diagnostics, path);
  return row;
}

function renderNumberControl(value: unknown, path: FormPathSegment[], label: string, min?: number, max?: number, fieldProfile?: UiFieldProfile): HTMLElement {
  const row = document.createElement('label');
  row.className = 'derbuilder-form-control-row';
  const text = document.createElement('span');
  text.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '1';
  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  input.value = typeof value === 'number' || typeof value === 'string' ? String(value) : '0';
  if (fieldProfile?.placeholder) input.placeholder = fieldProfile.placeholder;
  input.dataset.path = stringifyFormPath(path);
  input.dataset.valueKind = 'number';
  row.append(text, input);
  appendProfileDescription(row, fieldProfile);
  return row;
}

function renderCheckboxControl(value: boolean, path: FormPathSegment[], label: string, diagnostics: InstanceDiagnostic[], fieldProfile?: UiFieldProfile): HTMLElement {
  const row = document.createElement('label');
  row.className = 'derbuilder-form-checkbox-row';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = value;
  input.dataset.path = stringifyFormPath(path);
  input.dataset.valueKind = 'boolean';
  row.append(input, document.createTextNode(label));
  appendProfileDescription(row, fieldProfile);
  appendFieldDiagnostics(row, diagnostics, path);
  return row;
}

function renderNamedNumberSelect(values: Asn1NamedNumber[], value: unknown, path: FormPathSegment[], label: string, diagnostics: InstanceDiagnostic[], fieldProfile?: UiFieldProfile): HTMLElement {
  const row = document.createElement('label');
  row.className = 'derbuilder-form-control-row';
  const text = document.createElement('span');
  text.textContent = label;
  const select = document.createElement('select');
  select.dataset.path = stringifyFormPath(path);
  select.dataset.valueKind = 'string';
  for (const namedValue of values) {
    const option = document.createElement('option');
    option.value = namedValue.name;
    option.textContent = `${namedValue.name} (${namedValue.value})`;
    select.append(option);
  }
  select.value = typeof value === 'string' ? value : values.find((namedValue) => namedValue.value === value)?.name ?? values[0]?.name ?? '';
  row.append(text, select);
  appendProfileDescription(row, fieldProfile);
  appendFieldDiagnostics(row, diagnostics, path);
  return row;
}

function renderNullControl(path: FormPathSegment[], label: string, diagnostics: InstanceDiagnostic[], fieldProfile?: UiFieldProfile): HTMLElement {
  const row = document.createElement('div');
  row.className = 'derbuilder-form-null-row';
  const text = document.createElement('span');
  text.textContent = label;
  const value = document.createElement('code');
  value.textContent = 'null';
  row.append(text, value);
  appendProfileDescription(row, fieldProfile);
  appendFieldDiagnostics(row, diagnostics, path);
  return row;
}

function renderFormLegend(label: string): HTMLElement {
  const legend = document.createElement('div');
  legend.className = 'derbuilder-form-legend';
  legend.textContent = label;
  return legend;
}

function renderFormHint(text: string): HTMLElement {
  const hint = document.createElement('div');
  hint.className = 'derbuilder-form-hint';
  hint.textContent = text;
  return hint;
}

function renderHiddenField(): HTMLElement {
  const hidden = document.createElement('div');
  hidden.hidden = true;
  return hidden;
}

function renderCollapsedFieldBody(label: string, body: HTMLElement): HTMLElement {
  const details = document.createElement('details');
  details.className = 'derbuilder-form-collapsed';
  const summary = document.createElement('summary');
  summary.textContent = label;
  details.append(summary, body);
  return details;
}

function appendProfileDescription(container: HTMLElement, fieldProfile: UiFieldProfile | undefined): void {
  if (!fieldProfile?.description) return;
  container.append(renderFormHint(fieldProfile.description));
}

function sortFieldsByProfileOrder(fields: Asn1Field[], path: FormPathSegment[], uiProfile: UiProfile | undefined): Asn1Field[] {
  return fields
    .map((field, index) => ({ field, index, order: getUiFieldProfile(uiProfile, [...path, field.name])?.order }))
    .sort((left, right) => (left.order ?? left.index) - (right.order ?? right.index) || left.index - right.index)
    .map((item) => item.field);
}

function appendFieldDiagnostics(container: HTMLElement, diagnostics: InstanceDiagnostic[], path: FormPathSegment[]): void {
  const matching = diagnostics.filter((diagnostic) => pathsMatch(diagnostic.path, path));
  for (const diagnostic of matching) {
    const message = document.createElement('div');
    message.className = `derbuilder-form-diagnostic derbuilder-form-diagnostic-${diagnostic.severity}`;
    message.textContent = diagnostic.message;
    container.append(message);
  }
}

function pathsMatch(diagnosticPath: string[], formPath: FormPathSegment[]): boolean {
  if (diagnosticPath.length !== formPath.length) return false;
  return diagnosticPath.every((segment, index) => segment === String(formPath[index]));
}

function getByteMode(value: unknown, inputMode?: UiProfileInputMode): 'hex' | 'utf8' | 'base64' {
  if (isPlainObject(value)) {
    if (typeof value.utf8 === 'string') return 'utf8';
    if (typeof value.base64 === 'string') return 'base64';
  }
  if (inputMode === 'utf8' || inputMode === 'base64') return inputMode;
  return 'hex';
}

function getByteContent(value: unknown, mode: 'hex' | 'utf8' | 'base64'): string {
  if (isPlainObject(value) && typeof value[mode] === 'string') return value[mode];
  if (typeof value === 'string' && mode === 'hex') return value;
  return '';
}
