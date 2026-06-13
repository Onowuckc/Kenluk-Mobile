"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFrontendDocumentTypeLabel = exports.getDocumentTypeLabel = exports.getFrontendDocumentType = exports.getBackendDocumentType = exports.REVERSE_DOCUMENT_TYPE_MAP = exports.DOCUMENT_TYPE_MAP = void 0;
exports.DOCUMENT_TYPE_MAP = {
    nin: 'bvn',
    cac: 'cac',
    tin: 'tin',
    passport: 'passport',
    utility: 'proofOfAddress',
    director: 'directorInfo'
};
exports.REVERSE_DOCUMENT_TYPE_MAP = {
    bvn: 'nin',
    cac: 'cac',
    tin: 'tin',
    passport: 'passport',
    proofOfAddress: 'utility',
    directorInfo: 'director'
};
const getBackendDocumentType = (frontendType) => {
    return exports.DOCUMENT_TYPE_MAP[frontendType] || frontendType;
};
exports.getBackendDocumentType = getBackendDocumentType;
const getFrontendDocumentType = (backendType) => {
    return exports.REVERSE_DOCUMENT_TYPE_MAP[backendType] || backendType;
};
exports.getFrontendDocumentType = getFrontendDocumentType;
const getDocumentTypeLabel = (type) => {
    const labels = {
        bvn: 'Bank Verification Number (BVN)',
        cac: 'Corporate Affairs Commission (CAC)',
        tin: 'Tax Identification Number (TIN)',
        passport: 'International Passport',
        proofOfAddress: 'Proof of Address',
        directorInfo: 'Director Information'
    };
    return labels[type] || type;
};
exports.getDocumentTypeLabel = getDocumentTypeLabel;
const getFrontendDocumentTypeLabel = (frontendType) => {
    const backendType = (0, exports.getBackendDocumentType)(frontendType);
    return (0, exports.getDocumentTypeLabel)(backendType);
};
exports.getFrontendDocumentTypeLabel = getFrontendDocumentTypeLabel;
