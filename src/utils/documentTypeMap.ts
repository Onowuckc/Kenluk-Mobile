export const DOCUMENT_TYPE_MAP = {
  nin: 'bvn',
  cac: 'cac',
  tin: 'tin',
  passport: 'passport',
  utility: 'proofOfAddress',
  director: 'directorInfo'
} as const;

export const REVERSE_DOCUMENT_TYPE_MAP = {
  bvn: 'nin',
  cac: 'cac',
  tin: 'tin',
  passport: 'passport',
  proofOfAddress: 'utility',
  directorInfo: 'director'
} as const;

export const getBackendDocumentType = (frontendType: string): string => {
  return DOCUMENT_TYPE_MAP[frontendType as keyof typeof DOCUMENT_TYPE_MAP] || frontendType;
};

export const getFrontendDocumentType = (backendType: string): string => {
  return REVERSE_DOCUMENT_TYPE_MAP[backendType as keyof typeof REVERSE_DOCUMENT_TYPE_MAP] || backendType;
};

export const getDocumentTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    bvn: 'Bank Verification Number (BVN)',
    cac: 'Corporate Affairs Commission (CAC)',
    tin: 'Tax Identification Number (TIN)',
    passport: 'International Passport',
    proofOfAddress: 'Proof of Address',
    directorInfo: 'Director Information'
  };
  return labels[type] || type;
};

export const getFrontendDocumentTypeLabel = (frontendType: string): string => {
  const backendType = getBackendDocumentType(frontendType);
  return getDocumentTypeLabel(backendType);
};
