import { sectionObject } from '@/lib/report-content';

// Snapshot metadata is authoritative; older reports use their saved run selection.
export function reportAgentIds(sections: unknown, selected: unknown): string[] {
  const snapshot = sectionObject(sections);
  const metadata = sectionObject(snapshot['research_metadata']);
  const stored = Object.keys(sectionObject(snapshot['analyst_outputs'])).filter(id => id !== 'synthesis');
  const source = Array.isArray(metadata['agents']) ? metadata['agents'] : stored.length ? stored : selected;
  return Array.isArray(source) ? [...new Set(source.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))] : [];
}