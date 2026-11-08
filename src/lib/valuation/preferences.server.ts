import { readDataCache,writeDataCache,type EvidenceClient } from '@/lib/data-cache.server';
import { valuationPreferencesSchema,type ValuationPreferences } from './preferences';
import { secIndustry,secYahooPeer } from './peer-fallback.server';
import { eligiblePeers,type ComparableEvidence } from './comparables';
export async function readValuationPreferences(sb:EvidenceClient,userId:string,ticker:string):Promise<ValuationPreferences>{const stored=await readDataCache(sb,userId,'valuation-preferences',ticker);const parsed=valuationPreferencesSchema.safeParse(stored?.payload);return parsed.success?parsed.data:{overrides:{},peers:[],excludedPeers:[]};}
export async function saveValuationPreferences(sb:EvidenceClient,userId:string,ticker:string,value:ValuationPreferences){if(!await writeDataCache(sb,userId,'valuation-preferences',ticker,value,10*365*86400000))throw new Error('Valuation assumptions could not be saved.');}
export async function customPeers(comps:ComparableEvidence,ticker:string,date:string,prefs:ValuationPreferences){
  const filtered={...comps,peers:comps.peers.filter(p=>!prefs.excludedPeers.includes(p.ticker))};
  if(!prefs.peers.length)return {...filtered,status:filtered.peers.length>=3?'available' as const:'unavailable' as const};
  const classification=await secIndustry(ticker);if(!classification)return {...filtered,note:filtered.note+' Custom peer classification unavailable; suggestions not accepted.'};
  const subject=await secYahooPeer(ticker,date,classification);if(!subject)return filtered;
  const peers=[];for(let i=0;i<prefs.peers.length;i+=3){const batch=await Promise.all(prefs.peers.slice(i,i+3).map(t=>secYahooPeer(t,date,classification)));peers.push(...batch.filter(p=>p!==null));}
  // Do not blend text-industry and exact SIC cohorts.
  const existing=filtered.industry===classification.industry?filtered.peers:[];
  const verified=eligiblePeers([...existing,...peers],ticker,subject.marketCap,classification.industry).filter(p=>!prefs.excludedPeers.includes(p.ticker));
  return {...filtered,industry:classification.industry,peers:verified,status:verified.length>=3?'available' as const:'unavailable' as const,note:filtered.note+' Owner-selected peer candidates were independently checked for exact SEC SIC, USD and 0.25–4x size; rejected candidates contribute no figures.'};
}