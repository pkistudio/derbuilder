import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { createDefaultInput, removeValueAtPath, setFormControlValue, setValueAtPath } from '../src/internal/app/form-model';
import type { Asn1SchemaModule, Asn1Type } from '../src/core';

const profileType: Asn1Type = {
  kind: 'sequence',
  fields: [
    { name: 'name', type: { kind: 'utf8String' } },
    { name: 'age', type: { kind: 'integer' }, optional: true },
    { name: 'status', type: { kind: 'enumerated', values: [{ name: 'active', value: 0 }, { name: 'revoked', value: 1 }] } },
    { name: 'payload', type: { kind: 'octetString' }, optional: true }
  ]
};

const choiceType: Asn1Type = {
  kind: 'choice',
  alternatives: [
    { name: 'byName', type: { kind: 'utf8String' } },
    { name: 'bySerial', type: { kind: 'integer' } }
  ]
};

const schema: Asn1SchemaModule = {
  name: 'FormModelFixture',
  tagDefault: 'explicit',
  types: [
    { name: 'Profile', type: profileType },
    { name: 'Lookup', type: choiceType }
  ]
};

describe('form model helpers', () => {
  it('creates canonical Instance JSON defaults without optional fields', () => {
    expect(createDefaultInput(schema, { kind: 'defined', typeName: 'Profile' })).toEqual({
      name: '',
      status: 'active'
    });
  });

  it('creates a default CHOICE wrapper from the first alternative', () => {
    expect(createDefaultInput(schema, { kind: 'defined', typeName: 'Lookup' })).toEqual({
      selected: 'byName',
      value: ''
    });
  });

  it('updates nested object and array paths immutably', () => {
    const initial = { users: [{ name: 'Alice' }] };
    const updated = setValueAtPath(initial, ['users', 0, 'name'], 'Bob');

    expect(updated).toEqual({ users: [{ name: 'Bob' }] });
    expect(initial).toEqual({ users: [{ name: 'Alice' }] });
  });

  it('normalizes BIT STRING unusedBits edits into the canonical object shape', () => {
    expect(setFormControlValue({ subjectPublicKey: { hex: '0102' } }, ['subjectPublicKey', 'unusedBits'], 3)).toEqual({
      subjectPublicKey: {
        bytes: { hex: '0102' },
        unusedBits: 3
      }
    });
  });

  it('removes object fields and array items by form path', () => {
    expect(removeValueAtPath({ values: ['a', 'b'], note: 'keep' }, ['values', 0])).toEqual({ values: ['b'], note: 'keep' });
    expect(removeValueAtPath({ values: ['a'], note: 'remove' }, ['note'])).toEqual({ values: ['a'] });
  });
});
