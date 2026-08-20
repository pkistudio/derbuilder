import derEditorIconUrl from '@pkistudio/dereditor/dereditor.ico';
import {
  createInstance,
  parseAsn1Definition,
  resolveDefinedType,
  validateInstance,
  validateSchemaModule,
  type Asn1SchemaModule,
  type Asn1Type,
  type InstanceDiagnostic,
  type InstanceDocument,
  type SchemaDiagnostic
} from '../../core.js';
import { derEditorVersion, mountDerEditor, parseDerEditorInput } from '../../dereditor-adapter.js';
import { findDefinitionBundleEntry, getDefinitionBundleSampleInputs, getDefinitionBundleUiProfiles, isRawAsn1BundleSchemaSource, parseDefinitionBundleJsonWithDiagnostics, validateDefinitionBundle, type DefinitionBundle, type DefinitionBundleDiagnostic } from './definition-bundle.js';
import { consumeGeneratedDerTransfer, generatedDerTransferParameter, openGeneratedDerEditorTab, removeGeneratedDerTransferParameter, type GeneratedDerTransfer } from './dereditor-transfer.js';
import { createDefaultInput, findChoiceAlternative, getValueAtPath, parseFormPath, removeValueAtPath, setFormControlValue, setValueAtPath } from './form-model.js';
import { readFormControlValue, renderInputForm, updateInputModeButtons, type InputMode } from './form-renderer.js';
import { namedObjectDefinitionBundles } from './named-object-bundles.js';
import type { UiProfile } from './ui-profile.js';

declare const __DER_BUILDER_VERSION__: string;

export interface DerBuilderAppOptions {
  mount: string | HTMLElement;
  schema?: Asn1SchemaModule;
  input?: unknown;
  bundle?: DefinitionBundle;
  bundleEntry?: string;
}

export interface DerBuilderBuildOptions {
  typeName?: string;
  input?: unknown;
  openViewerTab?: boolean;
}

export interface DerBuilderApp {
  build(options?: DerBuilderBuildOptions): Promise<DerBuilderBuildResult>;
  loadBundle(bundle: DefinitionBundle, entryIdOrTypeName?: string): void;
  loadSchema(schema: Asn1SchemaModule): void;
  loadInput(input: unknown): void;
  close(): void;
}

export type DerBuilderBuildResult =
  | {
      ok: true;
      document: InstanceDocument;
      schemaDiagnostics: SchemaDiagnostic[];
      instanceDiagnostics: InstanceDiagnostic[];
    }
  | {
      ok: false;
      error: string;
      schemaDiagnostics: SchemaDiagnostic[];
      instanceDiagnostics: InstanceDiagnostic[];
    };

const emptySchema: Asn1SchemaModule = { name: '', tagDefault: 'explicit', types: [] };

type SampleInputMap = Record<string, unknown>;
type UiProfileMap = Record<string, UiProfile>;

export function initDerBuilder(options: DerBuilderAppOptions): DerBuilderApp {
  const mount = typeof options.mount === 'string' ? document.querySelector<HTMLElement>(options.mount) : options.mount;
  if (!mount) throw new Error('DER Builder mount element was not found.');
  if (hasDerEditorTransferPayload()) return initDerEditorTransfer(mount);

  mount.className = 'derbuilder-root';
  mount.innerHTML = renderShell();

  const definitionText = mustFind<HTMLTextAreaElement>(mount, '[data-role="definition"]');
  const definitionFileInput = mustFind<HTMLInputElement>(mount, '[data-role="definition-file"]');
  const definitionBundleFileInput = mustFind<HTMLInputElement>(mount, '[data-role="definition-bundle-file"]');
  const inputText = mustFind<HTMLTextAreaElement>(mount, '[data-role="input"]');
  const inputForm = mustFind<HTMLElement>(mount, '[data-role="input-form"]');
  const inputModeButtons = Array.from(mount.querySelectorAll<HTMLButtonElement>('[data-role="input-mode"]'));
  const typeSelect = mustFind<HTMLSelectElement>(mount, '[data-role="type"]');
  const diagnosticsList = mustFind<HTMLElement>(mount, '[data-role="diagnostics"]');
  const workspace = mustFind<HTMLElement>(mount, '[data-role="workspace"]');
  const workspaceResizer = mustFind<HTMLElement>(mount, '[data-role="workspace-resizer"]');
  const rightStack = mustFind<HTMLElement>(mount, '[data-role="right-stack"]');
  const diagnosticsResizer = mustFind<HTMLElement>(mount, '[data-role="diagnostics-resizer"]');
  const apiLog = mustFind<HTMLElement>(mount, '[data-role="api-log"]');
  const apiLogResizer = mustFind<HTMLElement>(mount, '[data-role="api-log-resizer"]');
  const clearApiLogButton = mustFind<HTMLButtonElement>(mount, '[data-role="clear-api-log"]');
  const loadDefinitionFileButton = mustFind<HTMLButtonElement>(mount, '[data-role="load-definition-file"]');
  const loadDefinitionBundleFileButton = mustFind<HTMLButtonElement>(mount, '[data-role="load-definition-bundle-file"]');
  const loadDefinitionClipboardButton = mustFind<HTMLButtonElement>(mount, '[data-role="load-definition-clipboard"]');
  const saveDefinitionFileButton = mustFind<HTMLButtonElement>(mount, '[data-role="save-definition-file"]');
  const saveDefinitionBundleFileButton = mustFind<HTMLButtonElement>(mount, '[data-role="save-definition-bundle-file"]');
  const closeDefinitionButton = mustFind<HTMLButtonElement>(mount, '[data-role="close-definition"]');
  const namedObjectButtons = Array.from(mount.querySelectorAll<HTMLButtonElement>('[data-role="load-named-object"]'));
  const definitionStatus = mustFind<HTMLElement>(mount, '[data-role="definition-status"]');
  const buildStatus = mustFind<HTMLElement>(mount, '[data-role="build-status"]');
  const buildButton = mustFind<HTMLButtonElement>(mount, '[data-role="build"]');
  const aboutButton = mustFind<HTMLButtonElement>(mount, '[data-role="about"]');
  const aboutDialog = mustFind<HTMLDialogElement>(mount, '[data-role="about-dialog"]');
  const closeAboutButton = mustFind<HTMLButtonElement>(mount, '[data-role="close-about"]');
  let schema = emptySchema;
  let input: unknown;
  let inputMode: InputMode = 'json';
  let currentInstanceDiagnostics: InstanceDiagnostic[] = [];
  let inputFormError: string | undefined;
  let activeSampleInputs: SampleInputMap | undefined;
  let activeUiProfiles: UiProfileMap | undefined;
  let activeDefinitionBundle: DefinitionBundle | undefined;
  let activeDefinitionBundleEntry: DefinitionBundle['entries'][number] | undefined;
  const apiLogEntries: ApiLogEntry[] = [];

  initializeWorkspaceResizer(mount, workspace, workspaceResizer);
  initializeDiagnosticsResizer(mount, rightStack, diagnosticsResizer);
  initializeApiLogResizer(mount, apiLogResizer);

  const updateDefinitionActionState = () => {
    const hasDefinition = definitionText.value.trim().length > 0;
    const hasInput = inputText.value.trim().length > 0;
    closeDefinitionButton.disabled = !hasDefinition;
    buildButton.disabled = !hasDefinition || !hasInput || typeSelect.options.length === 0;
  };

  const setInputValue = (nextInput: unknown): void => {
    input = nextInput;
    inputText.value = JSON.stringify(nextInput, null, 2);
    currentInstanceDiagnostics = [];
    inputFormError = undefined;
    renderActiveInputEditor();
    updateDefinitionActionState();
  };

  const createDefaultInputForSelectedType = (): unknown => {
    const typeName = typeSelect.value || schema.types[0]?.name;
    if (!typeName) return {};
    return createDefaultInput(schema, resolveDefinedType(schema, typeName));
  };

  const renderActiveInputEditor = (): void => {
    updateInputModeButtons(inputModeButtons, inputMode);
    inputText.hidden = inputMode !== 'json';
    inputForm.hidden = inputMode !== 'form';
    if (inputMode !== 'form') return;
    if (inputFormError) {
      inputForm.innerHTML = '';
      const message = document.createElement('div');
      message.className = 'derbuilder-form-empty derbuilder-form-error';
      message.textContent = inputFormError;
      inputForm.append(message);
      return;
    }
    const typeName = typeSelect.value || schema.types[0]?.name;
    if (!typeName) {
      inputForm.innerHTML = '<div class="derbuilder-form-empty">Load an ASN.1 definition and select a type.</div>';
      return;
    }
    try {
      const activeInput = input !== undefined ? input : createDefaultInputForSelectedType();
      input = activeInput;
      inputText.value = JSON.stringify(activeInput, null, 2);
      renderInputForm(inputForm, schema, resolveDefinedType(schema, typeName), activeInput, currentInstanceDiagnostics, activeUiProfiles?.[typeName]);
    } catch (error) {
      inputForm.innerHTML = '';
      const message = document.createElement('div');
      message.className = 'derbuilder-form-empty derbuilder-form-error';
      message.textContent = error instanceof Error ? error.message : String(error);
      inputForm.append(message);
    }
  };

  const setInputMode = (nextMode: InputMode): void => {
    inputMode = nextMode;
    if (nextMode === 'form') {
      try {
        input = inputText.value.trim().length > 0 ? JSON.parse(inputText.value) as unknown : createDefaultInputForSelectedType();
        inputText.value = JSON.stringify(input, null, 2);
        inputFormError = undefined;
      } catch (error) {
        inputFormError = `JSON input could not be loaded into the form: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    renderActiveInputEditor();
    updateDefinitionActionState();
  };

  const clearDefinitionWorkspace = () => {
    schema = emptySchema;
    input = undefined;
    currentInstanceDiagnostics = [];
    inputFormError = undefined;
    activeSampleInputs = undefined;
    activeUiProfiles = undefined;
    activeDefinitionBundle = undefined;
    activeDefinitionBundleEntry = undefined;
    definitionText.value = '';
    inputText.value = '';
    typeSelect.innerHTML = '';
    diagnosticsList.innerHTML = '';
    definitionStatus.textContent = 'Definition input is ready.';
    buildStatus.textContent = 'Build status is ready.';
    updateDefinitionActionState();
    renderActiveInputEditor();
  };

  const loadDefinitionText = (text: string, source: string, preferredTypeName?: string): boolean => {
    if (definitionText.value.trim().length > 0) clearDefinitionWorkspace();
    activeDefinitionBundle = undefined;
    activeDefinitionBundleEntry = undefined;
    definitionText.value = text;
    try {
      schema = parseDefinitionInput(text);
      refreshTypeSelect(preferredTypeName);
      const schemaDiagnostics = validateSchemaModule(schema);
      renderDiagnostics(diagnosticsList, [{ title: 'Schema', diagnostics: schemaDiagnostics }]);
      definitionStatus.textContent = schemaDiagnostics.length > 0 ? `Loaded from ${source}. Definition diagnostics: ${formatDiagnosticSummary(schemaDiagnostics)}` : `Loaded ${schema.types.length} ASN.1 type${schema.types.length === 1 ? '' : 's'} from ${source}.`;
      buildStatus.textContent = 'Definition loaded. Build DER to open the generated output in a new DerEditor tab.';
      updateDefinitionActionState();
      renderActiveInputEditor();
      appendApiLog(apiLog, apiLogEntries, { level: schemaDiagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 'error' : schemaDiagnostics.length > 0 ? 'warning' : 'success', label: 'loadDefinition', detail: `${source}: ${formatDiagnosticSummary(schemaDiagnostics)}` });
      return true;
    } catch (error) {
      typeSelect.innerHTML = '';
      renderDiagnostics(diagnosticsList, [{ title: 'Definition', diagnostics: [diagnosticFromError(error)] }]);
      definitionStatus.textContent = `Could not load definition from ${source}: ${error instanceof Error ? error.message : String(error)}`;
      buildStatus.textContent = 'Build status is waiting for a valid definition.';
      updateDefinitionActionState();
      appendApiLog(apiLog, apiLogEntries, { level: 'error', label: 'loadDefinition-error', detail: definitionStatus.textContent });
      return false;
    }
  };

  const refreshTypeSelect = (preferredTypeName = typeSelect.value) => {
    typeSelect.innerHTML = '';
    for (const type of schema.types) {
      const option = document.createElement('option');
      option.value = type.name;
      option.textContent = type.name;
      typeSelect.append(option);
    }
    if (preferredTypeName && schema.types.some((type) => type.name === preferredTypeName)) {
      typeSelect.value = preferredTypeName;
    }
  };

  const loadSampleInputForType = (typeName: string): boolean => {
    if (!activeSampleInputs || !Object.prototype.hasOwnProperty.call(activeSampleInputs, typeName)) return false;
    const sampleInput = activeSampleInputs[typeName];
    input = sampleInput;
    inputText.value = JSON.stringify(sampleInput, null, 2);
    currentInstanceDiagnostics = [];
    inputFormError = undefined;
    buildStatus.textContent = `Loaded ${typeName} sample input. Build DER to open the generated output in a new DerEditor tab.`;
    updateDefinitionActionState();
    renderActiveInputEditor();
    appendApiLog(apiLog, apiLogEntries, { level: 'success', label: 'loadSampleInput', detail: `${typeName}: loaded sample input.` });
    return true;
  };

  const loadSchemaModel = (nextSchema: Asn1SchemaModule, source: string, preferredTypeName?: string): boolean => {
    if (definitionText.value.trim().length > 0) clearDefinitionWorkspace();
    activeDefinitionBundle = undefined;
    activeDefinitionBundleEntry = undefined;
    schema = nextSchema;
    definitionText.value = JSON.stringify(nextSchema, null, 2);
    refreshTypeSelect(preferredTypeName);
    const schemaDiagnostics = validateSchemaModule(schema);
    renderDiagnostics(diagnosticsList, [{ title: 'Schema', diagnostics: schemaDiagnostics }]);
    definitionStatus.textContent = schemaDiagnostics.length > 0 ? `Loaded from ${source}. Definition diagnostics: ${formatDiagnosticSummary(schemaDiagnostics)}` : `Loaded ${schema.types.length} ASN.1 type${schema.types.length === 1 ? '' : 's'} from ${source}.`;
    buildStatus.textContent = 'Definition loaded. Build DER to open the generated output in a new DerEditor tab.';
    currentInstanceDiagnostics = [];
    inputFormError = undefined;
    updateDefinitionActionState();
    renderActiveInputEditor();
    appendApiLog(apiLog, apiLogEntries, { level: schemaDiagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 'error' : schemaDiagnostics.length > 0 ? 'warning' : 'success', label: 'loadSchema', detail: `${source}: ${formatDiagnosticSummary(schemaDiagnostics)}` });
    return !hasDiagnosticErrors(schemaDiagnostics);
  };

  const loadDefinitionBundle = (bundle: DefinitionBundle, entryIdOrTypeName: string | undefined, sourcePrefix: string): void => {
    const entry = entryIdOrTypeName ? findDefinitionBundleEntry(bundle, entryIdOrTypeName) : bundle.entries[0];
    if (!entry) {
      throw new Error(entryIdOrTypeName ? `Definition Bundle ${bundle.id} does not contain entry ${entryIdOrTypeName}.` : `Definition Bundle ${bundle.id} does not contain any entries.`);
    }
    const sourceName = isRawAsn1BundleSchemaSource(bundle.schema) ? bundle.schema.sourceName ?? bundle.id : bundle.id;
    const source = `${sourcePrefix}: ${bundle.label} (${sourceName})`;
    const loaded = isRawAsn1BundleSchemaSource(bundle.schema)
      ? loadDefinitionText(bundle.schema.source, source, entry.typeName)
      : loadSchemaModel(bundle.schema.schema, source, entry.typeName);
    if (!loaded) return;
    activeSampleInputs = getDefinitionBundleSampleInputs(bundle);
    activeUiProfiles = getDefinitionBundleUiProfiles(bundle);
    activeDefinitionBundle = bundle;
    activeDefinitionBundleEntry = entry;
    if (!loadSampleInputForType(entry.typeName)) {
      input = 'defaultInput' in entry ? entry.defaultInput : createDefaultInputForSelectedType();
      inputText.value = JSON.stringify(input, null, 2);
      renderActiveInputEditor();
      updateDefinitionActionState();
    }
    appendApiLog(apiLog, apiLogEntries, { level: 'success', label: 'loadBundle', detail: `${bundle.id}: loaded ${entry.typeName}.` });
  };

  const app: DerBuilderApp = {
    async build(buildOptions = {}) {
      let handledDiagnosticError = false;
      let schemaDiagnostics: SchemaDiagnostic[] = [];
      let instanceDiagnostics: InstanceDiagnostic[] = [];
      if (buildOptions.input !== undefined) setInputValue(buildOptions.input);
      appendApiLog(apiLog, apiLogEntries, { level: 'info', label: 'build', detail: 'Build DER requested.' });
      try {
        schema = parseDefinitionInput(definitionText.value);
        appendApiLog(apiLog, apiLogEntries, { level: 'success', label: 'parseAsn1Definition', detail: `Loaded ${schema.types.length} type${schema.types.length === 1 ? '' : 's'} from the definition input.` });
        definitionStatus.textContent = `Loaded ${schema.types.length} ASN.1 type${schema.types.length === 1 ? '' : 's'} from the definition.`;
        refreshTypeSelect();
        updateDefinitionActionState();
        schemaDiagnostics = validateSchemaModule(schema);
        appendApiLog(apiLog, apiLogEntries, { level: schemaDiagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 'error' : schemaDiagnostics.length > 0 ? 'warning' : 'success', label: 'validateSchemaModule', detail: formatDiagnosticSummary(schemaDiagnostics) });
        renderDiagnostics(diagnosticsList, [{ title: 'Schema', diagnostics: schemaDiagnostics }]);
        if (schemaDiagnostics.length > 0) {
          definitionStatus.textContent = `Definition diagnostics: ${formatDiagnosticSummary(schemaDiagnostics)}`;
        }
        if (hasDiagnosticErrors(schemaDiagnostics)) {
          handledDiagnosticError = true;
          throw new Error('Schema diagnostics contain errors. Fix them before building DER.');
        }

        input = JSON.parse(inputText.value) as unknown;
        const typeName = buildOptions.typeName ?? (typeSelect.value || schema.types[0]?.name);
        if (!typeName) throw new Error('The schema does not define any ASN.1 types.');
        if (schema.types.some((type) => type.name === typeName)) typeSelect.value = typeName;
        instanceDiagnostics = validateInstance(schema, typeName, input);
        currentInstanceDiagnostics = instanceDiagnostics;
        renderActiveInputEditor();
        appendApiLog(apiLog, apiLogEntries, { level: instanceDiagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 'error' : instanceDiagnostics.length > 0 ? 'warning' : 'success', label: 'validateInstance', detail: `${typeName}: ${formatDiagnosticSummary(instanceDiagnostics)}` });
        renderDiagnostics(diagnosticsList, [
          { title: 'Schema', diagnostics: schemaDiagnostics },
          { title: 'Instance', diagnostics: instanceDiagnostics }
        ]);
        if (hasDiagnosticErrors(instanceDiagnostics)) {
          handledDiagnosticError = true;
          throw new Error('Instance diagnostics contain errors. Fix the input before building DER.');
        }

        const document = createInstance(schema, typeName, input);
        appendApiLog(apiLog, apiLogEntries, { level: 'success', label: 'createInstance', detail: `${document.typeName}: ${document.der.byteLength} DER bytes.` });
        const warningCount = [...schemaDiagnostics, ...instanceDiagnostics].filter((diagnostic) => diagnostic.severity === 'warning').length;
        const buildSummary = warningCount > 0 ? `Built ${document.typeName} as ${document.der.byteLength} DER bytes with ${warningCount} warning${warningCount === 1 ? '' : 's'}.` : `Built ${document.typeName} as ${document.der.byteLength} DER bytes.`;
        parseDerEditorInput(document.der, 'der');
        if (buildOptions.openViewerTab ?? true) {
          const viewerTab = openGeneratedDerEditorTab(document.der, document.typeName);
          if (viewerTab.opened) {
            buildStatus.textContent = `${buildSummary} Opened the result in a new DerEditor tab.`;
            appendApiLog(apiLog, apiLogEntries, { level: 'success', label: 'openDerEditorTab', detail: `Opened ${document.typeName} in a new editable DerEditor tab.` });
          } else {
            buildStatus.textContent = `${buildSummary} ${viewerTab.reason}`;
            appendApiLog(apiLog, apiLogEntries, { level: 'warning', label: 'openDerEditorTab', detail: viewerTab.reason });
          }
        } else {
          buildStatus.textContent = buildSummary;
          appendApiLog(apiLog, apiLogEntries, { level: 'info', label: 'openDerEditorTab', detail: 'Opening a DerEditor tab was disabled for this build.' });
        }
        return { ok: true, document, schemaDiagnostics, instanceDiagnostics };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appendApiLog(apiLog, apiLogEntries, { level: 'error', label: 'build-error', detail: message });
        buildStatus.textContent = message;
        if (!handledDiagnosticError) {
          renderDiagnostics(diagnosticsList, [{ title: 'Build', diagnostics: [diagnosticFromError(error)] }]);
        }
        return { ok: false, error: message, schemaDiagnostics, instanceDiagnostics };
      }
    },
    loadBundle(bundle, entryIdOrTypeName) {
      loadDefinitionBundle(bundle, entryIdOrTypeName, 'DefinitionBundle');
    },
    loadSchema(nextSchema) {
      schema = nextSchema;
      activeSampleInputs = undefined;
      activeUiProfiles = undefined;
      activeDefinitionBundle = undefined;
      activeDefinitionBundleEntry = undefined;
      definitionText.value = JSON.stringify(schema, null, 2);
      refreshTypeSelect();
      currentInstanceDiagnostics = [];
      inputFormError = undefined;
      renderActiveInputEditor();
      updateDefinitionActionState();
    },
    loadInput(nextInput) {
      setInputValue(nextInput);
    },
    close() {
      mount.innerHTML = '';
      mount.className = '';
    }
  };

  clearApiLogButton.addEventListener('click', () => {
    apiLogEntries.splice(0);
    renderApiLog(apiLog, apiLogEntries);
  });
  closeDefinitionButton.addEventListener('click', clearDefinitionWorkspace);
  inputText.addEventListener('input', () => {
    currentInstanceDiagnostics = [];
    inputFormError = undefined;
    updateDefinitionActionState();
  });
  for (const button of inputModeButtons) {
    button.addEventListener('click', () => setInputMode(button.dataset.mode === 'form' ? 'form' : 'json'));
  }
  inputForm.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement) && !(target instanceof HTMLSelectElement)) return;
    if (!target.dataset.path || !target.dataset.valueKind) return;
    const path = parseFormPath(target.dataset.path);
    input = setFormControlValue(input, path, readFormControlValue(target));
    inputText.value = JSON.stringify(input, null, 2);
    currentInstanceDiagnostics = [];
    inputFormError = undefined;
    updateDefinitionActionState();
  });
  inputForm.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return;
    if (target instanceof HTMLInputElement && target.dataset.action === 'toggle-field' && target.dataset.path && target.dataset.fieldType) {
      const path = parseFormPath(target.dataset.path);
      input = target.checked ? setValueAtPath(input, path, createDefaultInput(schema, JSON.parse(target.dataset.fieldType) as Asn1Type)) : removeValueAtPath(input, path);
      inputText.value = JSON.stringify(input, null, 2);
      currentInstanceDiagnostics = [];
      inputFormError = undefined;
      renderActiveInputEditor();
      updateDefinitionActionState();
      return;
    }
    if (target.dataset.action === 'choice-selected' && target.dataset.path && target.dataset.choiceType) {
      const path = parseFormPath(target.dataset.path);
      const choice = findChoiceAlternative(schema, JSON.parse(target.dataset.choiceType) as Asn1Type, target.value);
      if (!choice) return;
      input = setValueAtPath(input, path, { selected: target.value, value: createDefaultInput(schema, choice.type) });
      inputText.value = JSON.stringify(input, null, 2);
      currentInstanceDiagnostics = [];
      inputFormError = undefined;
      renderActiveInputEditor();
      updateDefinitionActionState();
      return;
    }
    if (target.dataset.action === 'byte-mode' && target.dataset.path) {
      const path = parseFormPath(target.dataset.path);
      input = setValueAtPath(input, path, { [target.value]: '' });
      inputText.value = JSON.stringify(input, null, 2);
      currentInstanceDiagnostics = [];
      inputFormError = undefined;
      renderActiveInputEditor();
      updateDefinitionActionState();
      return;
    }
    if (target.dataset.path && target.dataset.valueKind) {
      const path = parseFormPath(target.dataset.path);
      input = setFormControlValue(input, path, readFormControlValue(target));
      inputText.value = JSON.stringify(input, null, 2);
      currentInstanceDiagnostics = [];
      inputFormError = undefined;
      updateDefinitionActionState();
    }
  });
  inputForm.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-action]') : null;
    if (!button || !button.dataset.path) return;
    const path = parseFormPath(button.dataset.path);
    if (button.dataset.action === 'add-item' && button.dataset.itemType) {
      const current = getValueAtPath(input, path);
      const nextItems = Array.isArray(current) ? [...current] : [];
      nextItems.push(createDefaultInput(schema, JSON.parse(button.dataset.itemType) as Asn1Type));
      input = setValueAtPath(input, path, nextItems);
    } else if (button.dataset.action === 'remove-item' && button.dataset.index) {
      const current = getValueAtPath(input, path);
      if (!Array.isArray(current)) return;
      const nextItems = current.filter((_, index) => index !== Number.parseInt(button.dataset.index ?? '', 10));
      input = setValueAtPath(input, path, nextItems);
    } else {
      return;
    }
    inputText.value = JSON.stringify(input, null, 2);
    currentInstanceDiagnostics = [];
    inputFormError = undefined;
    renderActiveInputEditor();
    updateDefinitionActionState();
  });
  typeSelect.addEventListener('change', () => {
    activeDefinitionBundleEntry = activeDefinitionBundle?.entries.find((entry) => entry.typeName === typeSelect.value);
    if (!loadSampleInputForType(typeSelect.value) && inputMode === 'form') {
      setInputValue(createDefaultInputForSelectedType());
    } else {
      renderActiveInputEditor();
    }
  });
  loadDefinitionFileButton.addEventListener('click', () => definitionFileInput.click());
  loadDefinitionBundleFileButton.addEventListener('click', () => definitionBundleFileInput.click());
  loadDefinitionClipboardButton.addEventListener('click', async () => {
    try {
      if (definitionText.value.trim().length > 0) clearDefinitionWorkspace();
      const text = await navigator.clipboard.readText();
      loadDefinitionText(text, 'clipboard');
    } catch (error) {
      definitionStatus.textContent = `Could not read definition from clipboard: ${error instanceof Error ? error.message : String(error)}`;
      appendApiLog(apiLog, apiLogEntries, { level: 'error', label: 'clipboard-read-error', detail: definitionStatus.textContent });
    }
  });
  saveDefinitionFileButton.addEventListener('click', () => {
    saveTextFile(definitionText.value, 'asn1-definition.asn1');
    appendApiLog(apiLog, apiLogEntries, { level: 'success', label: 'saveDefinition', detail: 'Saved the definition text to asn1-definition.asn1.' });
  });
  saveDefinitionBundleFileButton.addEventListener('click', () => {
    try {
      const bundle = createDefinitionBundleFromWorkspace(definitionText.value, inputText.value, typeSelect.value, activeUiProfiles?.[typeSelect.value], activeDefinitionBundle, activeDefinitionBundleEntry);
      const diagnostics = validateDefinitionBundle(bundle);
      if (hasDiagnosticErrors(diagnostics)) {
        renderDiagnostics(diagnosticsList, [{ title: 'Definition Bundle', diagnostics }]);
        definitionStatus.textContent = `Could not save Definition Bundle: ${formatDiagnosticSummary(diagnostics)}`;
        appendApiLog(apiLog, apiLogEntries, { level: 'error', label: 'validateExportedDefinitionBundle', detail: formatDiagnosticSummary(diagnostics) });
        return;
      }
      saveTextFile(JSON.stringify(bundle, null, 2), `${sanitizeFileName(bundle.id)}.definition-bundle.json`);
      appendApiLog(apiLog, apiLogEntries, { level: diagnostics.length > 0 ? 'warning' : 'success', label: 'validateExportedDefinitionBundle', detail: `${bundle.id}: ${formatDiagnosticSummary(diagnostics)}` });
      appendApiLog(apiLog, apiLogEntries, { level: 'success', label: 'saveDefinitionBundle', detail: `Saved ${bundle.id} as a Definition Bundle.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      definitionStatus.textContent = `Could not save Definition Bundle: ${message}`;
      appendApiLog(apiLog, apiLogEntries, { level: 'error', label: 'saveDefinitionBundle-error', detail: definitionStatus.textContent });
    }
  });
  for (const button of namedObjectButtons) {
    button.addEventListener('click', () => {
      const namedObject = namedObjectDefinitionBundles.find((bundle) => bundle.id === button.dataset.objectId);
      if (!namedObject) return;
      loadDefinitionBundle(namedObject, namedObject.id, 'NamedObjects');
      closeMenuAfterSelection(button, definitionText);
    });
  }
  definitionFileInput.addEventListener('change', async () => {
    const file = definitionFileInput.files?.[0];
    definitionFileInput.value = '';
    if (!file) return;
    try {
      if (definitionText.value.trim().length > 0) clearDefinitionWorkspace();
      loadDefinitionText(await file.text(), file.name);
    } catch (error) {
      definitionStatus.textContent = `Could not read definition file: ${error instanceof Error ? error.message : String(error)}`;
      appendApiLog(apiLog, apiLogEntries, { level: 'error', label: 'file-read-error', detail: definitionStatus.textContent });
    }
  });
  definitionBundleFileInput.addEventListener('change', async () => {
    const file = definitionBundleFileInput.files?.[0];
    definitionBundleFileInput.value = '';
    if (!file) return;
    try {
      if (definitionText.value.trim().length > 0) clearDefinitionWorkspace();
      const result = parseDefinitionBundleJsonWithDiagnostics(await file.text());
      if (hasDiagnosticErrors(result.diagnostics) || !result.bundle) {
        renderDiagnostics(diagnosticsList, [{ title: 'Definition Bundle', diagnostics: result.diagnostics }]);
        definitionStatus.textContent = `Could not load Definition Bundle file ${file.name}: ${formatDiagnosticSummary(result.diagnostics)}`;
        buildStatus.textContent = 'Build status is waiting for a valid Definition Bundle.';
        appendApiLog(apiLog, apiLogEntries, { level: 'error', label: 'validateDefinitionBundle', detail: `${file.name}: ${formatDiagnosticSummary(result.diagnostics)}` });
        updateDefinitionActionState();
        renderActiveInputEditor();
        return;
      }
      appendApiLog(apiLog, apiLogEntries, { level: result.diagnostics.length > 0 ? 'warning' : 'success', label: 'validateDefinitionBundle', detail: `${file.name}: ${formatDiagnosticSummary(result.diagnostics)}` });
      const bundle = result.bundle;
      loadDefinitionBundle(bundle, undefined, 'DefinitionBundle file');
    } catch (error) {
      definitionStatus.textContent = `Could not load Definition Bundle file: ${error instanceof Error ? error.message : String(error)}`;
      appendApiLog(apiLog, apiLogEntries, { level: 'error', label: 'loadBundle-error', detail: definitionStatus.textContent });
      updateDefinitionActionState();
      renderActiveInputEditor();
    }
  });
  buildButton.addEventListener('click', () => void app.build());
  aboutButton.addEventListener('click', () => {
    if (typeof aboutDialog.showModal === 'function') {
      aboutDialog.showModal();
    } else {
      aboutDialog.setAttribute('open', '');
    }
  });
  closeAboutButton.addEventListener('click', () => aboutDialog.close());
  if (options.bundle) app.loadBundle(options.bundle, options.bundleEntry);
  else if (options.schema) app.loadSchema(options.schema);
  if (options.input !== undefined) app.loadInput(options.input);
  updateDefinitionActionState();
  renderActiveInputEditor();
  return app;
}

function renderShell(): string {
  return `
    <nav class="derbuilder-toolbar" aria-label="Application toolbar">
      <strong>DER Builder</strong>
      <button type="button" data-role="about">About</button>
    </nav>
    <main class="derbuilder-workspace" data-role="workspace">
      <section class="derbuilder-panel derbuilder-definition-panel">
        <nav class="derbuilder-pane-menu" aria-label="Definition actions">
          <div class="derbuilder-menu-item">
            <button type="button" aria-haspopup="menu">Load</button>
            <div class="derbuilder-submenu" role="menu">
              <button type="button" role="menuitem" data-role="load-definition-file">from ASN.1/Schema File</button>
              <button type="button" role="menuitem" data-role="load-definition-clipboard">from Clipboard</button>
              <button type="button" role="menuitem" data-role="load-definition-bundle-file">Definition Bundle</button>
              <div class="derbuilder-menu-item derbuilder-nested-menu-item" role="none">
                <button type="button" role="menuitem" aria-haspopup="menu">NamedObjects</button>
                <div class="derbuilder-submenu derbuilder-named-objects-menu" role="menu">
                  ${renderNamedObjectMenuItems()}
                </div>
              </div>
            </div>
          </div>
          <div class="derbuilder-menu-item">
            <button type="button" aria-haspopup="menu">Save</button>
            <div class="derbuilder-submenu" role="menu">
              <button type="button" role="menuitem" data-role="save-definition-file">to File</button>
              <button type="button" role="menuitem" data-role="save-definition-bundle-file">Definition Bundle</button>
            </div>
          </div>
          <button type="button" data-role="close-definition" disabled>Close</button>
        </nav>
        <div class="derbuilder-left-card">
          <textarea data-role="definition" spellcheck="false" readonly></textarea>
          <input data-role="definition-file" type="file" accept=".asn1,.txt,.json,application/json,text/plain" hidden />
          <input data-role="definition-bundle-file" type="file" accept=".definition-bundle.json,.bundle.json,application/json" hidden />
          <p class="derbuilder-notice derbuilder-definition-status" data-role="definition-status">Definition input is ready.</p>
        </div>
      </section>
      <div data-role="workspace-resizer" class="derbuilder-workspace-resizer" role="separator" aria-label="Resize definition pane" aria-orientation="vertical" tabindex="0"></div>
      <section class="derbuilder-right-stack" data-role="right-stack">
        <section class="derbuilder-panel derbuilder-instance-panel">
          <div class="derbuilder-panel-title">
            <span>Instance Input</span>
            <button type="button" data-role="build">Build DER</button>
          </div>
          <div class="derbuilder-instance-controls">
            <select data-role="type" aria-label="ASN.1 type"></select>
            <div class="derbuilder-input-mode-tabs" role="tablist" aria-label="Instance input mode">
              <button type="button" data-role="input-mode" data-mode="form" role="tab">Form</button>
              <button type="button" data-role="input-mode" data-mode="json" role="tab">JSON</button>
            </div>
          </div>
          <div data-role="input-form" class="derbuilder-input-form" hidden></div>
          <textarea data-role="input" spellcheck="false"></textarea>
        </section>
        <div data-role="diagnostics-resizer" class="derbuilder-pane-resizer" role="separator" aria-label="Resize diagnostics pane" aria-orientation="horizontal" tabindex="0"></div>
        <section class="derbuilder-diagnostics-panel">
          <nav class="derbuilder-pane-menu derbuilder-diagnostics-menu" aria-label="Diagnostics pane">
            <span>Diagnostics</span>
          </nav>
          <div class="derbuilder-diagnostics-card">
            <div data-role="diagnostics" class="derbuilder-diagnostics" aria-live="polite"></div>
            <p class="derbuilder-notice derbuilder-build-status" data-role="build-status" aria-live="polite">Build status is ready.</p>
          </div>
        </section>
      </section>
    </main>
    <div data-role="api-log-resizer" class="derbuilder-api-log-resizer" role="separator" aria-label="Resize API log" aria-orientation="horizontal" tabindex="0"></div>
    <section class="derbuilder-log-panel" aria-label="API call log">
      <div class="derbuilder-api-log-header">
        <button type="button" data-role="clear-api-log">Clear</button>
      </div>
      <ol data-role="api-log" class="derbuilder-api-log"></ol>
    </section>
    <dialog class="derbuilder-about-dialog" data-role="about-dialog">
      <section class="derbuilder-about-panel">
        <div>
          <div class="derbuilder-about-name">DER Builder</div>
          <div class="derbuilder-about-version">Version ${__DER_BUILDER_VERSION__}</div>
          <div class="derbuilder-about-version">DerEditor ${derEditorVersion}</div>
        </div>
        <p>Build DER instances from supported ASN.1 definitions and inspect successful output in DerEditor.</p>
        <form method="dialog">
          <button type="button" data-role="close-about">Close</button>
        </form>
      </section>
    </dialog>
  `;
}

function renderNamedObjectMenuItems(): string {
  return namedObjectDefinitionBundles.map((bundle) => `<button type="button" role="menuitem" data-role="load-named-object" data-object-id="${bundle.id}">${bundle.label}</button>`).join('');
}

function closeMenuAfterSelection(button: HTMLButtonElement, focusTarget: HTMLElement): void {
  const menuItems = Array.from(button.closest('.derbuilder-pane-menu')?.querySelectorAll('.derbuilder-menu-item') ?? []).filter((element) => element instanceof HTMLElement) as HTMLElement[];
  button.blur();
  focusTarget.focus({ preventScroll: true });
  if (menuItems.length === 0) return;
  for (const menuItem of menuItems) menuItem.classList.add('is-closed');
  const reopen = () => {
    for (const menuItem of menuItems) menuItem.classList.remove('is-closed');
  };
  for (const menuItem of menuItems) menuItem.addEventListener('pointerleave', reopen, { once: true });
  window.setTimeout(reopen, 1000);
}

function parseDefinitionInput(value: string): Asn1SchemaModule {
  const trimmed = value.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed) as Asn1SchemaModule;
  return parseAsn1Definition(trimmed);
}

function createDefinitionBundleFromWorkspace(
  definitionSource: string,
  inputSource: string,
  typeName: string,
  uiProfile: UiProfile | undefined,
  sourceBundle: DefinitionBundle | undefined,
  sourceEntry: DefinitionBundle['entries'][number] | undefined
): DefinitionBundle {
  const trimmedDefinition = definitionSource.trim();
  if (trimmedDefinition.length === 0) throw new Error('Load a definition before saving a Definition Bundle.');
  if (!typeName) throw new Error('Select an ASN.1 type before saving a Definition Bundle.');

  const entryId = sourceEntry?.id ?? toKebabCase(typeName);
  const entry: DefinitionBundle['entries'][number] = {
    ...sourceEntry,
    id: entryId,
    typeName,
    label: sourceEntry?.label ?? typeName
  };
  if (sourceEntry?.description) entry.description = sourceEntry.description;
  const trimmedInput = inputSource.trim();
  if (trimmedInput.length > 0) entry.sampleInput = JSON.parse(trimmedInput) as unknown;
  if (uiProfile) entry.uiProfile = uiProfile;
  const sourceSchema = sourceBundle?.schema;
  const sourceName = sourceSchema && isRawAsn1BundleSchemaSource(sourceSchema) ? sourceSchema.sourceName ?? 'asn1-definition.asn1' : 'asn1-definition.asn1';
  const schemaSource: DefinitionBundle['schema'] = trimmedDefinition.startsWith('{')
    ? {
        ...(sourceSchema?.format === 'schema-model' ? sourceSchema : {}),
        format: 'schema-model',
        schema: JSON.parse(trimmedDefinition) as Asn1SchemaModule
      }
    : {
        ...(sourceSchema?.format === 'asn1' ? sourceSchema : {}),
        format: 'asn1',
        sourceName,
        source: trimmedDefinition
      };

  const entries = sourceBundle
    ? sourceBundle.entries.map((bundleEntry) => bundleEntry === sourceEntry ? entry : bundleEntry)
    : [entry];
  if (sourceBundle && !sourceEntry) entries.push(entry);

  return {
    ...sourceBundle,
    id: sourceBundle?.id ?? `local.${entryId}`,
    version: sourceBundle?.version ?? '1.0.0',
    label: sourceBundle?.label ?? typeName,
    ...(sourceBundle?.description ? { description: sourceBundle.description } : {}),
    schema: schemaSource,
    entries
  };
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'definition-bundle';
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'definition-bundle';
}

type AppDiagnostic = SchemaDiagnostic | InstanceDiagnostic | DefinitionBundleDiagnostic;

type ApiLogLevel = 'info' | 'success' | 'warning' | 'error';

interface ApiLogEntry {
  timestamp: Date;
  level: ApiLogLevel;
  label: string;
  detail: string;
}

interface NewApiLogEntry {
  level: ApiLogLevel;
  label: string;
  detail: string;
}

interface DiagnosticSection {
  title: string;
  diagnostics: AppDiagnostic[];
}

function renderDiagnostics(container: HTMLElement, sections: DiagnosticSection[]): void {
  container.innerHTML = '';
  const populatedSections = sections.filter((section) => section.diagnostics.length > 0);
  if (populatedSections.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'derbuilder-diagnostics-empty';
    empty.textContent = 'No diagnostics.';
    container.append(empty);
    return;
  }

  for (const section of populatedSections) {
    const sectionElement = document.createElement('section');
    sectionElement.className = 'derbuilder-diagnostics-section';
    const title = document.createElement('div');
    title.className = 'derbuilder-diagnostics-title';
    title.textContent = section.title;
    sectionElement.append(title);

    const list = document.createElement('ul');
    for (const diagnostic of section.diagnostics) {
      const item = document.createElement('li');
      item.className = `derbuilder-diagnostic derbuilder-diagnostic-${diagnostic.severity}`;
      item.textContent = formatDiagnostic(diagnostic);
      list.append(item);
    }
    sectionElement.append(list);
    container.append(sectionElement);
  }
}

function formatDiagnostic(diagnostic: AppDiagnostic): string {
  const path = diagnostic.path.length > 0 ? ` at ${diagnostic.path.join('.')}` : '';
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code}${path}: ${diagnostic.message}`;
}

function hasDiagnosticErrors(diagnostics: AppDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

function formatDiagnosticSummary(diagnostics: AppDiagnostic[]): string {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;
  if (errors === 0 && warnings === 0) return 'no diagnostics.';
  return `${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`;
}

function appendApiLog(container: HTMLElement, entries: ApiLogEntry[], entry: NewApiLogEntry): void {
  entries.push({ ...entry, timestamp: new Date() });
  if (entries.length > 80) entries.splice(0, entries.length - 80);
  renderApiLog(container, entries);
}

function renderApiLog(container: HTMLElement, entries: ApiLogEntry[]): void {
  container.innerHTML = '';
  for (const entry of entries) {
    const item = document.createElement('li');
    item.className = `derbuilder-api-log-entry ${entry.level}`;

    const time = document.createElement('time');
    time.dateTime = entry.timestamp.toISOString();
    time.textContent = formatApiLogTimestamp(entry.timestamp);

    const operation = document.createElement('span');
    operation.className = 'derbuilder-api-log-operation';
    operation.textContent = entry.label;

    const detail = document.createElement('span');
    detail.className = 'derbuilder-api-log-detail';
    detail.textContent = entry.detail;

    item.append(time, operation, detail);
    container.append(item);
  }
  container.scrollTop = container.scrollHeight;
}

function initializeWorkspaceResizer(root: HTMLElement, workspace: HTMLElement, resizer: HTMLElement): void {
  const minWidth = 260;
  const minRightWidth = 360;
  let startX = 0;
  let startWidth = 0;

  const stopResize = () => {
    root.classList.remove('resizing-columns');
    document.removeEventListener('pointermove', resize);
    document.removeEventListener('pointerup', stopResize);
  };

  const resize = (event: PointerEvent) => {
    setDefinitionPaneWidth(workspace, startWidth + event.clientX - startX, minWidth, minRightWidth);
  };

  resizer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    startX = event.clientX;
    startWidth = getDefinitionPaneWidth(workspace);
    root.classList.add('resizing-columns');
    document.addEventListener('pointermove', resize);
    document.addEventListener('pointerup', stopResize, { once: true });
  });

  resizer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 16 : -16;
    setDefinitionPaneWidth(workspace, getDefinitionPaneWidth(workspace) + delta, minWidth, minRightWidth);
  });
}

function getDefinitionPaneWidth(workspace: HTMLElement): number {
  const definitionPane = workspace.firstElementChild;
  if (definitionPane instanceof HTMLElement) return definitionPane.getBoundingClientRect().width;
  return Number.parseFloat(getComputedStyle(workspace).getPropertyValue('--definition-pane-width')) || 340;
}

function setDefinitionPaneWidth(workspace: HTMLElement, width: number, minWidth: number, minRightWidth: number): void {
  const bounds = workspace.getBoundingClientRect();
  const maxWidth = Math.max(minWidth, bounds.width - minRightWidth - 18);
  const nextWidth = clamp(width, minWidth, maxWidth);
  workspace.style.setProperty('--definition-pane-width', `${nextWidth}px`);
}

function initializeDiagnosticsResizer(root: HTMLElement, rightStack: HTMLElement, resizer: HTMLElement): void {
  const minHeight = 76;
  const minInstanceHeight = 96;
  let startY = 0;
  let startHeight = 0;

  const stopResize = () => {
    root.classList.remove('resizing-inner-rows');
    document.removeEventListener('pointermove', resize);
    document.removeEventListener('pointerup', stopResize);
  };

  const resize = (event: PointerEvent) => {
    setDiagnosticsPaneHeight(rightStack, startHeight - (event.clientY - startY), minHeight, minInstanceHeight);
  };

  resizer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    startY = event.clientY;
    startHeight = getDiagnosticsPaneHeight(rightStack);
    root.classList.add('resizing-inner-rows');
    document.addEventListener('pointermove', resize);
    document.addEventListener('pointerup', stopResize, { once: true });
  });

  resizer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const delta = event.key === 'ArrowUp' ? 16 : -16;
    setDiagnosticsPaneHeight(rightStack, getDiagnosticsPaneHeight(rightStack) + delta, minHeight, minInstanceHeight);
  });
}

function formatApiLogTimestamp(date: Date): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function getDiagnosticsPaneHeight(rightStack: HTMLElement): number {
  const diagnosticsPane = rightStack.lastElementChild;
  if (diagnosticsPane instanceof HTMLElement) return diagnosticsPane.getBoundingClientRect().height;
  return Number.parseFloat(getComputedStyle(rightStack).getPropertyValue('--diagnostics-pane-height')) || 220;
}

function setDiagnosticsPaneHeight(rightStack: HTMLElement, height: number, minHeight: number, minInstanceHeight: number): void {
  const bounds = rightStack.getBoundingClientRect();
  const maxHeight = Math.max(minHeight, bounds.height - minInstanceHeight - 18);
  const nextHeight = clamp(height, minHeight, maxHeight);
  rightStack.style.setProperty('--diagnostics-pane-height', `${nextHeight}px`);
}

function saveTextFile(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function initializeApiLogResizer(root: HTMLElement, resizer: HTMLElement): void {
  const minHeight = 86;
  const minWorkspaceHeight = 220;
  let startY = 0;
  let startHeight = 0;

  const stopResize = () => {
    root.classList.remove('resizing-rows');
    document.removeEventListener('pointermove', resize);
    document.removeEventListener('pointerup', stopResize);
  };

  const resize = (event: PointerEvent) => {
    const nextHeight = clamp(startHeight - (event.clientY - startY), minHeight, getMaxApiLogHeight(root, minWorkspaceHeight, minHeight));
    root.style.setProperty('--api-log-height', `${nextHeight}px`);
  };

  resizer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    startY = event.clientY;
    const currentHeight = getComputedStyle(root).getPropertyValue('--api-log-height').trim();
    startHeight = Number.parseFloat(currentHeight) || 156;
    root.classList.add('resizing-rows');
    document.addEventListener('pointermove', resize);
    document.addEventListener('pointerup', stopResize, { once: true });
  });

  resizer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const currentHeight = Number.parseFloat(getComputedStyle(root).getPropertyValue('--api-log-height')) || 156;
    const delta = event.key === 'ArrowUp' ? 16 : -16;
    const nextHeight = clamp(currentHeight + delta, minHeight, getMaxApiLogHeight(root, minWorkspaceHeight, minHeight));
    root.style.setProperty('--api-log-height', `${nextHeight}px`);
  });
}

function getMaxApiLogHeight(root: HTMLElement, minWorkspaceHeight: number, minApiLogHeight: number): number {
  const toolbarHeight = root.querySelector('.derbuilder-toolbar')?.getBoundingClientRect().height ?? 0;
  const splitterHeight = root.querySelector('.derbuilder-api-log-resizer')?.getBoundingClientRect().height ?? 6;
  const availableHeight = root.getBoundingClientRect().height || window.innerHeight;
  return Math.max(minApiLogHeight, Math.floor(availableHeight - toolbarHeight - splitterHeight - minWorkspaceHeight));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function diagnosticFromError(error: unknown): AppDiagnostic {
  return {
    severity: 'error',
    code: 'build-error',
    message: error instanceof Error ? error.message : String(error),
    path: []
  };
}

function hasDerEditorTransferPayload(): boolean {
  const search = new URL(window.location.href).searchParams;
  return search.has(generatedDerTransferParameter) || search.has('subtree') || search.has('expand');
}

function initDerEditorTransfer(mount: HTMLElement): DerBuilderApp {
  setDocumentIcon(derEditorIconUrl);
  mount.className = 'derbuilder-transfer-root';
  mount.innerHTML = '<main class="derbuilder-transfer-shell"><section data-role="der-viewer" class="derbuilder-der-viewer"></section></main>';
  const viewerMount = mustFind<HTMLElement>(mount, '[data-role="der-viewer"]');
  let generatedTransfer: GeneratedDerTransfer | undefined;
  let transferError: string | undefined;
  const url = new URL(window.location.href);
  if (url.searchParams.has(generatedDerTransferParameter)) {
    try {
      generatedTransfer = consumeGeneratedDerTransfer(url, window.localStorage);
    } catch (error) {
      transferError = `Could not load generated DER: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      const cleanUrl = removeGeneratedDerTransferParameter(url);
      window.history.replaceState(null, '', cleanUrl.toString());
    }
  }
  const viewer = mountDerEditor(viewerMount, { editable: true });
  if (generatedTransfer) {
    document.title = `${generatedTransfer.label} · DerEditor`;
    viewer.loadBytes(generatedTransfer.bytes, `${generatedTransfer.label} · generated DER`);
  } else if (transferError) {
    const message = document.createElement('p');
    message.className = 'derbuilder-transfer-error';
    message.textContent = transferError;
    viewerMount.append(message);
  }
  return {
    async build() {
      return {
        ok: false,
        error: 'Build is unavailable in DerEditor transfer mode.',
        schemaDiagnostics: [],
        instanceDiagnostics: []
      };
    },
    loadBundle() {},
    loadSchema() {},
    loadInput() {},
    close() {
      viewer.close();
    }
  };
}

function setDocumentIcon(url: string): void {
  let icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    icon.setAttribute('sizes', 'any');
    document.head.append(icon);
  }
  icon.href = url;
}

function mustFind<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing app element: ${selector}.`);
  return element;
}
