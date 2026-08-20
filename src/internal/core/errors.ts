export class DerBuilderError extends Error {
  constructor(message: string, readonly path: string[] = []) {
    super(path.length > 0 ? `${message} at ${path.join('.')}` : message);
    this.name = 'DerBuilderError';
  }
}

export function withPath(error: unknown, segment: string): never {
  if (error instanceof DerBuilderError) {
    throw new DerBuilderError(error.message.replace(/ at .+$/, ''), [segment, ...error.path]);
  }
  throw error;
}
