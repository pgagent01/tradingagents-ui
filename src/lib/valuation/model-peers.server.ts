import type { ComparableEvidence } from './comparables';
import { eligiblePeers } from './comparables';
import { secIndustry, secYahooPeer } from './peer-fallback.server';
import { parsePeerSuggestions } from './peer-suggestions';
/** Uses an already-paid analyst response; no second LLM call or inferred multiples. */
export async function verifyModelPeers(current: ComparableEvidence, text: string, subject: string, date: string, model: string, today = new Date().toISOString().slice(0,10)): Promise<ComparableEvidence> {
  if (date !== today || current.status === 'available') return current;
  const candidates = parsePeerSuggestions(text, subject);
  if (!candidates.length) return current;
  const classification = await secIndustry(subject);
  if (!classification) return current;
  const own = await secYahooPeer(subject, date, classification);
  if (!own) return current;
  const verified = [];
  for (let i = 0; i < candidates.length; i += 3) {
    const batch = await Promise.all(candidates.slice(i,i+3).map(ticker => secYahooPeer(ticker,date,classification)));
    for (const p of batch) if (p) verified.push(p);
  }
  const existing = current.peers.filter(p => p.industry === classification.industry);
  const peers = eligiblePeers([...existing,...verified],subject,own.marketCap,classification.industry);
  return {...current,industry:classification.industry,peers,summaries:[],status:peers.length>=3?'available':'unavailable',note:`${current.note} Additional candidates proposed by report-selected fundamentals model ${model}; ${candidates.length} suggestions independently checked using exact SEC SIC, USD and 0.25×–4× size filters. ${peers.length} verified peers total; model suggestions alone never establish financial values.`};
}