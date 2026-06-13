export const getPaymentStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_admin_approval: 'Waiting Admin Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    submitted_to_reap: 'Processing',
    processing: 'Processing Payment',
    completed: 'Completed',
    failed: 'Failed',
  };
  return labels[status.toLowerCase()] || labels[status] || status;
};

export const getPaymentStatusStyles = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('completed') || s.includes('success')) {
    return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
  }
  if (s.includes('pending') || s.includes('wait') || s.includes('draft')) {
    return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
  }
  if (s.includes('processing') || s.includes('submitted')) {
    return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' };
  }
  if (s.includes('reject') || s.includes('fail') || s.includes('cancel')) {
    return { bg: 'bg-red-50 border-red-200', text: 'text-red-700' };
  }
  return { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600' };
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

