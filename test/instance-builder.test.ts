import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, exampleInput, exampleSchema } from '../src/core';

describe('createInstance', () => {
  it('builds DER for the example Person schema', () => {
    const document = createInstance(exampleSchema, 'Person', exampleInput);
    expect(bytesToHex(document.der)).toBe('301e0c05416c69636502012a1612616c696365406578616d706c652e74657374');
  });

  it('omits absent optional fields', () => {
    const document = createInstance(exampleSchema, 'Person', { name: 'Bob' });
    expect(bytesToHex(document.der)).toBe('30050c03426f62');
  });

  it('reports missing required fields with a useful error', () => {
    expect(() => createInstance(exampleSchema, 'Person', { age: 1 })).toThrow('Missing required field: name');
  });
});
