/** Shared provenance vocabulary; source adapters keep their own typed payloads. */
export type EvidenceState = 'available' | 'empty' | 'failed' | 'disabled' | 'rejected' | 'conflicting' | 'stale';
export type EvidenceProvenance = {
  kind: 'news' | 'financial' | 'price' | 'company'; entityId: string; securityId?: string;
  source: string; sourceRecordId?: string; sourceUrl?: string; retrievedAt: string;
  effectiveAt: string | null; publishedAt?: string | null; filedAt?: string | null;
  currency?: string; unit?: string; periodStart?: string; periodEnd?: string;
  basis?: 'annual' | 'quarter' | 'ttm' | 'instant'; accession?: string;
  adjustment?: 'unadjusted' | 'split_adjusted' | 'total_return'; version: string;
};
export type EvidenceAudit = {
  version: string; scope: string; received: number; retained: number; duplicates: number;
  rejected: number; truncated: number; conflicts: number;
  reasons: Record<string, number>;
  records: { evidenceId?: string; reason: string; alternatives?: { publishedAt: string; excerpt?: string; service: string }[] }[];
};
/** Financial periods matching only by end date is insufficient. */
export function financialCompatibility(a: Partial<EvidenceProvenance>, b: Partial<EvidenceProvenance>) {
  const fields = ['entityId','currency','unit','basis','periodEnd'] as const;
  for (const field of fields) if (!a[field] || !b[field] || a[field] !== b[field]) return `Incompatible or missing ${field}`;
  if (a.basis !== 'instant' && (!a.periodStart || !b.periodStart || a.periodStart !== b.periodStart)) return 'Incompatible or missing periodStart';
  if (a.securityId !== b.securityId) return 'Incompatible securityId';
  return null;
}