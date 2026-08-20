import { base64ToBytes, bytesToBase64 } from '../../dereditor-adapter.js';

export const generatedDerTransferParameter = 'derbuilderDocument';
export const generatedDerTransferKeyPrefix = 'derbuilder-document-';

const generatedDerTransferProtocol = 'derbuilder-generated-der';
const generatedDerTransferVersion = 1;
const generatedDerTransferLifetimeMs = 60_000;

export interface GeneratedDerTransfer {
  label: string;
  bytes: Uint8Array;
}

export type OpenGeneratedDerEditorTabResult =
  | { opened: true }
  | { opened: false; reason: string };

interface GeneratedDerTransferPayload {
  protocol: typeof generatedDerTransferProtocol;
  version: typeof generatedDerTransferVersion;
  label: string;
  bytes: string;
}

export function encodeGeneratedDerTransfer(transfer: GeneratedDerTransfer): string {
  const payload: GeneratedDerTransferPayload = {
    protocol: generatedDerTransferProtocol,
    version: generatedDerTransferVersion,
    label: transfer.label,
    bytes: bytesToBase64(transfer.bytes)
  };
  return JSON.stringify(payload);
}

export function decodeGeneratedDerTransfer(payloadText: string): GeneratedDerTransfer {
  const payload = JSON.parse(payloadText) as Partial<GeneratedDerTransferPayload> | null;
  if (
    !payload
    || payload.protocol !== generatedDerTransferProtocol
    || payload.version !== generatedDerTransferVersion
    || typeof payload.label !== 'string'
    || payload.label.trim().length === 0
    || typeof payload.bytes !== 'string'
  ) {
    throw new Error('The generated DER transfer payload is invalid or unsupported.');
  }
  const bytes = base64ToBytes(payload.bytes);
  if (bytes.byteLength === 0) throw new Error('The generated DER transfer payload is empty.');
  return { label: payload.label, bytes };
}

export function openGeneratedDerEditorTab(bytes: Uint8Array, label: string): OpenGeneratedDerEditorTabResult {
  const key = createGeneratedDerTransferKey();
  try {
    window.localStorage.setItem(key, encodeGeneratedDerTransfer({ label, bytes }));
  } catch (error) {
    return {
      opened: false,
      reason: `Could not stage generated DER for DerEditor: ${error instanceof Error ? error.message : String(error)}`
    };
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('subtree');
  url.searchParams.delete('expand');
  url.searchParams.set(generatedDerTransferParameter, key);
  url.hash = '';

  let viewerWindow: Window | null;
  try {
    viewerWindow = window.open(url.toString(), '_blank');
  } catch (error) {
    removeStagedTransfer(key);
    return {
      opened: false,
      reason: `Could not open the DerEditor tab: ${error instanceof Error ? error.message : String(error)}`
    };
  }
  if (!viewerWindow) {
    removeStagedTransfer(key);
    return {
      opened: false,
      reason: 'Could not open the DerEditor tab because the browser blocked the popup.'
    };
  }

  try {
    viewerWindow.opener = null;
  } catch {
    // The new same-origin tab consumes and removes the staged payload itself.
  }
  window.setTimeout(() => {
    removeStagedTransfer(key);
  }, generatedDerTransferLifetimeMs);
  return { opened: true };
}

export function consumeGeneratedDerTransfer(url: URL, storage: Pick<Storage, 'getItem' | 'removeItem'>): GeneratedDerTransfer | undefined {
  const key = url.searchParams.get(generatedDerTransferParameter);
  if (key === null) return undefined;
  if (!key.startsWith(generatedDerTransferKeyPrefix)) {
    throw new Error('The generated DER transfer key is invalid.');
  }
  const payloadText = storage.getItem(key);
  storage.removeItem(key);
  if (payloadText === null) throw new Error('The generated DER transfer payload is missing or expired.');
  return decodeGeneratedDerTransfer(payloadText);
}

export function removeGeneratedDerTransferParameter(url: URL): URL {
  const cleanUrl = new URL(url.toString());
  cleanUrl.searchParams.delete(generatedDerTransferParameter);
  return cleanUrl;
}

function createGeneratedDerTransferKey(): string {
  const id = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${generatedDerTransferKeyPrefix}${id}`;
}

function removeStagedTransfer(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // The receiving tab normally removes the payload before this fallback.
  }
}
