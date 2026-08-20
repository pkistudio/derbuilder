export const builtInOidNames: Record<string, string> = {
  commonName: '2.5.4.3',
  countryName: '2.5.4.6',
  localityName: '2.5.4.7',
  stateOrProvinceName: '2.5.4.8',
  organizationName: '2.5.4.10',
  organizationalUnitName: '2.5.4.11',
  rsaEncryption: '1.2.840.113549.1.1.1',
  sha256WithRSAEncryption: '1.2.840.113549.1.1.11',
  idEcPublicKey: '1.2.840.10045.2.1',
  prime256v1: '1.2.840.10045.3.1.7',
  subjectKeyIdentifier: '2.5.29.14',
  keyUsage: '2.5.29.15',
  subjectAltName: '2.5.29.17',
  basicConstraints: '2.5.29.19',
  authorityKeyIdentifier: '2.5.29.35',
  extendedKeyUsage: '2.5.29.37'
};

export function resolveObjectIdentifierName(input: string, oidNames?: Record<string, string>): string {
  if (/^\d+(?:\.\d+)+$/.test(input)) return input;
  const resolved = oidNames?.[input] ?? builtInOidNames[input];
  if (!resolved) return input;
  return resolved;
}
