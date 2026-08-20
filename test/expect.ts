import assert from 'node:assert/strict';

type Matcher = {
  readonly not: Matcher;
  toBe(expected: unknown): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toContain(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveLength(expected: number): void;
  toMatch(expected: RegExp | string): void;
  toMatchObject(expected: unknown): void;
  toThrow(expected?: RegExp | string): void;
};

type ArrayContaining = { readonly __arrayContaining: readonly unknown[] };
type ObjectContaining = { readonly __objectContaining: Record<string, unknown> };

export const expect = Object.assign(
  (actual: unknown): Matcher => createMatcher(actual, false),
  {
    arrayContaining(expected: readonly unknown[]): ArrayContaining {
      return { __arrayContaining: expected };
    },
    objectContaining(expected: Record<string, unknown>): ObjectContaining {
      return { __objectContaining: expected };
    }
  }
);

function createMatcher(actual: unknown, negate: boolean): Matcher {
  const check = (condition: boolean, message: string): void => {
    if (negate ? condition : !condition) throw new assert.AssertionError({ message });
  };
  const matcher: Matcher = {
    get not() {
      return createMatcher(actual, !negate);
    },
    toBe(expected) {
      check(Object.is(actual, expected), `Expected ${format(actual)} ${negate ? 'not ' : ''}to be ${format(expected)}`);
    },
    toBeDefined() {
      check(actual !== undefined, `Expected value ${negate ? 'not ' : ''}to be defined`);
    },
    toBeUndefined() {
      check(actual === undefined, `Expected ${format(actual)} ${negate ? 'not ' : ''}to be undefined`);
    },
    toContain(expected) {
      const contains = typeof actual === 'string'
        ? actual.includes(String(expected))
        : Array.isArray(actual) && actual.some((value) => isDeepEqual(value, expected));
      check(contains, `Expected ${format(actual)} ${negate ? 'not ' : ''}to contain ${format(expected)}`);
    },
    toEqual(expected) {
      const equal = isArrayContaining(expected)
        ? Array.isArray(actual) && expected.__arrayContaining.every((item) => actual.some((candidate) => matchesObject(candidate, item)))
        : hasAsymmetricMatcher(expected)
          ? matchesObject(actual, expected)
          : isDeepEqual(actual, expected);
      check(equal, `Expected ${format(actual)} ${negate ? 'not ' : ''}to equal ${format(expected)}`);
    },
    toHaveLength(expected) {
      const length = (actual as { length?: unknown } | null)?.length;
      check(length === expected, `Expected length ${format(length)} ${negate ? 'not ' : ''}to be ${expected}`);
    },
    toMatch(expected) {
      const value = String(actual);
      const matches = typeof expected === 'string' ? value.includes(expected) : expected.test(value);
      check(matches, `Expected ${format(actual)} ${negate ? 'not ' : ''}to match ${String(expected)}`);
    },
    toMatchObject(expected) {
      check(matchesObject(actual, expected), `Expected ${format(actual)} ${negate ? 'not ' : ''}to match object ${format(expected)}`);
    },
    toThrow(expected) {
      let error: unknown;
      try {
        (actual as () => unknown)();
      } catch (caught) {
        error = caught;
      }
      let matches = error !== undefined;
      const message = error instanceof Error ? error.message : String(error);
      if (matches && expected instanceof RegExp) matches = expected.test(message);
      if (matches && typeof expected === 'string') matches = message.includes(expected);
      check(matches, `Expected function ${negate ? 'not ' : ''}to throw${expected ? ` ${String(expected)}` : ''}`);
    }
  };
  return matcher;
}

function isDeepEqual(actual: unknown, expected: unknown): boolean {
  try {
    assert.deepEqual(actual, expected);
    return true;
  } catch {
    return false;
  }
}

function matchesObject(actual: unknown, expected: unknown): boolean {
  if (isObjectContaining(expected)) return matchesObject(actual, expected.__objectContaining);
  if (!expected || typeof expected !== 'object') return isDeepEqual(actual, expected);
  if (!actual || typeof actual !== 'object') return false;
  if (Array.isArray(expected)) {
    return Array.isArray(actual) &&
      actual.length >= expected.length &&
      expected.every((value, index) => matchesObject(actual[index], value));
  }
  return Object.entries(expected).every(([key, value]) =>
    Object.prototype.hasOwnProperty.call(actual, key) &&
    matchesObject((actual as Record<string, unknown>)[key], value)
  );
}

function isArrayContaining(value: unknown): value is ArrayContaining {
  return Boolean(value && typeof value === 'object' && '__arrayContaining' in value);
}

function isObjectContaining(value: unknown): value is ObjectContaining {
  return Boolean(value && typeof value === 'object' && '__objectContaining' in value);
}

function hasAsymmetricMatcher(value: unknown): boolean {
  if (isArrayContaining(value) || isObjectContaining(value)) return true;
  if (Array.isArray(value)) return value.some(hasAsymmetricMatcher);
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some(hasAsymmetricMatcher);
}

function format(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
