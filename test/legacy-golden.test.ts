import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { bytesToHex, createInstance, parseAsn1Definition } from '../src/core.js';
import { parseDerEditorInput } from '../src/dereditor-adapter.js';

interface LegacyDerCase {
  definition: string;
  typeName: string;
  input: string;
  derHex: string;
}

interface LegacyDerManifest {
  sourceRepository: string;
  sourceCommit: string;
  cases: LegacyDerCase[];
}

const root = new URL('../', import.meta.url);

test('matches every selected legacy DER fixture byte-for-byte and round-trips it in DerEditor', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('test/fixtures/legacy-der-manifest.json', root), 'utf8')
  ) as LegacyDerManifest;
  assert.equal(manifest.sourceRepository, 'pkistudio/asn1instancebuilder');
  assert.equal(manifest.sourceCommit, '6ed3d620bf5ab7bffbb557dd9fe065daaf3788b3');
  assert.equal(manifest.cases.length, 17);

  for (const fixture of manifest.cases) {
    const definition = await readFile(new URL(`src/examples/${fixture.definition}`, root), 'utf8');
    const input = JSON.parse(await readFile(new URL(`src/examples/${fixture.input}`, root), 'utf8')) as unknown;
    const document = createInstance(parseAsn1Definition(definition), fixture.typeName, input);
    assert.equal(bytesToHex(document.der), fixture.derHex, `${fixture.input} as ${fixture.typeName}`);
    assert.deepEqual(parseDerEditorInput(document.der, 'der').encodedBytes, document.der);
  }
});
