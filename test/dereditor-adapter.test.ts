import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDerEditorInput } from '../src/dereditor-adapter.js';
import { createInstance, parseAsn1Definition } from '../src/core.js';

const definition = `Example DEFINITIONS ::= BEGIN
Person ::= SEQUENCE {
  name UTF8String,
  age INTEGER OPTIONAL
}
END`;

test('round-trips generated DER through the published DerEditor Core API', () => {
  const schema = parseAsn1Definition(definition);
  const generated = createInstance(schema, 'Person', { name: 'Alice', age: 42 });
  const parsed = parseDerEditorInput(generated.der, 'der');

  assert.deepEqual(parsed.bytes, generated.der);
  assert.deepEqual(parsed.encodedBytes, generated.der);
  assert.equal(parsed.nodes.length, 1);
});
