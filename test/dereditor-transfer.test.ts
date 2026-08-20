import assert from 'node:assert/strict';
import test from 'node:test';
import {
  consumeGeneratedDerTransfer,
  decodeGeneratedDerTransfer,
  encodeGeneratedDerTransfer,
  generatedDerTransferKeyPrefix,
  generatedDerTransferParameter,
  removeGeneratedDerTransferParameter
} from '../src/internal/app/dereditor-transfer.js';

test('round-trips a DER Builder-owned generated DER transfer payload', () => {
  const transfer = { label: 'Person', bytes: Uint8Array.from([0x30, 0x03, 0x02, 0x01, 0x2a]) };
  const decoded = decodeGeneratedDerTransfer(encodeGeneratedDerTransfer(transfer));

  assert.equal(decoded.label, transfer.label);
  assert.deepEqual(decoded.bytes, transfer.bytes);
});

test('consumes only DER Builder transfer keys and removes the payload', () => {
  const key = `${generatedDerTransferKeyPrefix}test`;
  const values = new Map([[key, encodeGeneratedDerTransfer({ label: 'Answer', bytes: Uint8Array.from([0x02, 0x01, 0x2a]) })]]);
  const storage = {
    getItem: (itemKey: string) => values.get(itemKey) ?? null,
    removeItem: (itemKey: string) => void values.delete(itemKey)
  };
  const url = new URL(`https://example.test/app/?${generatedDerTransferParameter}=${key}`);

  const consumed = consumeGeneratedDerTransfer(url, storage);
  assert.equal(consumed?.label, 'Answer');
  assert.deepEqual(consumed?.bytes, Uint8Array.from([0x02, 0x01, 0x2a]));
  assert.equal(values.has(key), false);
  assert.equal(removeGeneratedDerTransferParameter(url).searchParams.has(generatedDerTransferParameter), false);

  const unrelatedUrl = new URL(`https://example.test/app/?${generatedDerTransferParameter}=unrelated-key`);
  assert.throws(() => consumeGeneratedDerTransfer(unrelatedUrl, storage), /transfer key is invalid/);
});

test('rejects malformed, unsupported, and empty transfer payloads', () => {
  assert.throws(() => decodeGeneratedDerTransfer('{}'), /invalid or unsupported/);
  assert.throws(
    () => decodeGeneratedDerTransfer(JSON.stringify({ protocol: 'derbuilder-generated-der', version: 2, label: 'Person', bytes: 'MAA=' })),
    /invalid or unsupported/
  );
  assert.throws(
    () => decodeGeneratedDerTransfer(JSON.stringify({ protocol: 'derbuilder-generated-der', version: 1, label: 'Person', bytes: '' })),
    /payload is empty/
  );
});
