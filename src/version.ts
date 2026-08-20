declare const __DER_BUILDER_VERSION__: string | undefined;

export const DER_BUILDER_VERSION = typeof __DER_BUILDER_VERSION__ === 'string'
  ? __DER_BUILDER_VERSION__
  : '0.1.0';
