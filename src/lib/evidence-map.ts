import type { ResearchEvidence } from './data-evidence';
const all=['fundamentals','technical','sentiment','news','risk','debate','synthesis'];
export type EvidenceMapRow={source:string;fields:string;agents:string[];state:string;policy:string};
type StateFor=(key:string)=>string;
/** Shared row definitions; `stateFor` supplies per-report or general availability text. */
function rows(stateFor:StateFor):EvidenceMapRow[]{
 return [
  {source:'SEC financials',fields:'Annual/quarter/TTM revenue, earnings, cash flow, balance sheet, filing dates/accessions, reconciliation',agents:['fundamentals','risk','debate','synthesis'],state:stateFor('sec'),policy:'Filed by cutoff; compatible periods only. Existing fact provenance retained.'},
  {source:'Yahoo / enabled FMP / Alpha Vantage stock snapshot',fields:'Quote, currency, market cap, provider ratios, statements, source references and compatible price checks',agents:all,state:stateFor('snapshot'),policy:'Current-date runs only; source fallback not independent verification. Price history handled separately.'},
  {source:'Daily price history',fields:'Dated OHLCV, calculated technical indicators, warm-up availability',agents:['technical','risk','debate','synthesis'],state:stateFor('prices'),policy:'Analysis-date cutoff; retrospective adjustments are not certified point-in-time data. Indicators also supplied as availability context to all roles.'},
  {source:'Unified news: Yahoo / Google RSS / Firecrawl / Tiingo',fields:'Canonical URLs, publisher/date, bounded partial excerpts, grouped events, source IDs, duplicate/conflict audit',agents:['fundamentals','macro','sentiment','news','risk','debate','synthesis'],state:stateFor('news'),policy:'Technical receives chart-window event references and quality audit, not the full news feed. No full-article reading implied.'},
  {source:'Wikipedia / company filings / optional FMP profile',fields:'Dated company description, business facts, source links and revision references',agents:['fundamentals','risk','debate','synthesis'],state:stateFor('company'),policy:'Wikipedia reference context also goes to news/sentiment; current company profile excluded from historical runs.'},
  {source:'FRED',fields:'Rates, yield curve, inflation, GDP, unemployment; observation/vintage dates',agents:['fundamentals','macro','risk','debate','synthesis'],state:stateFor('fred'),policy:'Vintage-aware; missing key/coverage stays unavailable.'},
  {source:'Polymarket',fields:'Event probabilities, liquidity, dates and links',agents:['sentiment','news','risk','debate','synthesis'],state:stateFor('polymarket'),policy:'Crowd probabilities, not verified forecasts; current quotes excluded from historical runs.'},
  {source:'GDELT / SEC releases / FINRA / World Bank',fields:'Dated news/tone, tagged earnings facts/excerpts, short-interest coverage, macro observations',agents:['fundamentals','macro','news','sentiment','technical','risk','debate','synthesis'],state:stateFor('free'),policy:'Each role receives relevant subsets only; unavailable datasets remain explicit. GDELT tone is not social sentiment.'},
  {source:'Calculated valuation / verified comparable inputs',fields:'Scenarios, assumptions, rates, peer inputs and limitations',agents:['fundamentals','risk','debate','synthesis'],state:stateFor('valuation'),policy:'Derived values labelled; descriptive post-report peer table is not an input to valuation.'},
  {source:'Massive',fields:'Ticker identity and previous-day bar access check only',agents:[],state:stateFor('massive'),policy:'No provider facts sent to analysts, cached or exported until usage rights confirmed.'},
  {source:'Direct social posts',fields:'None',agents:[],state:stateFor('social'),policy:'No connected social feed; news proxies never relabelled as measured social opinion.'},
 ];
}
/** Map describes supplied evidence, not a promise of exhaustive/raw provider retention. */
export function researchDataMap(e:ResearchEvidence):EvidenceMapRow[]{
 return rows(key=>{
  switch(key){
   case 'sec':return e.fundamentals?.status??'unavailable';
   case 'snapshot':return 'conditional_current_date';
   case 'prices':return 'conditional_available';
   case 'news':return e.news?.status??'unavailable';
   case 'company':return e.companyContext?'available':'unavailable';
   case 'fred':return e.macro.status;
   case 'polymarket':return e.predictions.status;
   case 'free':return 'source_specific';
   case 'valuation':return e.valuation?.status??'conditional_available';
   case 'massive':return 'pilot_only';
   default:return 'unavailable';
  }
 });
}
/** General availability for the standalone data-flow page; not tied to one report. */
export function generalDataMap():EvidenceMapRow[]{
 return rows(key=>{
  switch(key){
   case 'sec':return 'US-listed filers; unavailable for non-SEC companies';
   case 'snapshot':return 'Current-date runs; optional providers need your own enabled key';
   case 'prices':return 'When daily history is available for the ticker';
   case 'news':return 'RSS/GDELT free; Firecrawl and Tiingo need your own enabled key';
   case 'company':return 'When a dated Wikipedia revision or filing profile resolves';
   case 'fred':return 'Free; no key required';
   case 'polymarket':return 'Free; current-date runs only';
   case 'free':return 'Free; per-dataset coverage varies';
   case 'valuation':return 'Calculated when financial inputs pass quality checks';
   case 'massive':return 'Pilot access check only';
   default:return 'Not connected';
  }
 });
}
