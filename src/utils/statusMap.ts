export const getPaymentStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Successful',
    successful: 'Successful',
    failed: 'Failed',
  };
  return labels[status.toLowerCase()] || status;
};

export const getDocumentStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pending Review',
    approved: 'Verified',
    verified: 'Verified',
    rejected: 'Rejected',
  };
  return labels[status.toLowerCase()] || status;
};
