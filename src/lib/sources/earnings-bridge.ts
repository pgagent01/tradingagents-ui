export type ReleaseFact={metric:'revenue'|'operatingIncome'|'netIncome';value:number;periodStart:string;periodEnd:string;unit:'USD';filed:string;accession:string;url:string;basis:'GAAP reported';passage:string};
const text=(s:string)=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const attrs=(s:string)=>Object.fromEntries([...s.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1]?.toLowerCase(),m[2]]));
/** Only explicitly tagged reported GAAP USD duration facts qualify. Untagged prose/tables are never guessed. */
export function taggedReleaseFacts(html:string,source:{filed:string;accession:string;url:string},cutoff:string):ReleaseFact[]{
  if(source.filed>cutoff||html.length>2000000)return [];
  const contexts=new Map<string,{start:string;end:string}>();
  for(const m of html.matchAll(/<(?:xbrli:)?context\b([^>]*)>([\s\S]*?)<\/(?:xbrli:)?context>/gi)){
    const a=attrs(m[1]??''),body=m[2]??'',start=/<(?:xbrli:)?startDate>([^<]+)<\//i.exec(body)?.[1],end=/<(?:xbrli:)?endDate>([^<]+)<\//i.exec(body)?.[1];
    if(a['id']&&start&&end&&end<=cutoff&&!/<(?:xbrli:)?(?:segment|scenario)\b/i.test(body))contexts.set(a['id'],{start,end});
  }
  const units=new Set<string>();for(const m of html.matchAll(/<(?:xbrli:)?unit\b([^>]*)>([\s\S]*?)<\/(?:xbrli:)?unit>/gi)){const a=attrs(m[1]??'');if(a['id']&&/^\s*<(?:xbrli:)?measure>iso4217:USD<\/(?:xbrli:)?measure>\s*$/i.test(m[2]??''))units.add(a['id']);}
  const mapping:Record<string,ReleaseFact['metric']>={'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax':'revenue','us-gaap:Revenues':'revenue','us-gaap:SalesRevenueNet':'revenue','us-gaap:OperatingIncomeLoss':'operatingIncome','us-gaap:NetIncomeLoss':'netIncome'};
  const facts:ReleaseFact[]=[];
  for(const m of html.matchAll(/<ix:nonFraction\b([^>]*)>([\s\S]*?)<\/ix:nonFraction>/gi)){
    const a=attrs(m[1]??''),metric=mapping[a['name']??''],period=contexts.get(a['contextref']??''),passage=text(m[2]??'');
    if(!metric||!period||!units.has(a['unitref']??'')||a['nil']==='true'||a['xsi:nil']==='true'||a['format']&&!/^ixt(?:\w*)?:num(?:dotdecimal|commadecimal|dot-decimal|comma-decimal)$/i.test(a['format']))continue;
    // Comma decimals and ambiguous lexical values are intentionally not accepted.
    if(a['format']?.toLowerCase().includes('comma')||!/^\(?-?[\d,]+(?:\.\d+)?\)?$/.test(passage))continue;
    const scale=Number(a['scale']??0);if(!Number.isInteger(scale)||scale<0||scale>9)continue;
    const negative=a['sign']==='-'||passage.startsWith('('),value=Number(passage.replace(/[(),]/g,''))*10**scale*(negative?-1:1);
    if(!Number.isFinite(value))continue;
    facts.push({metric,value,periodStart:period.start,periodEnd:period.end,unit:'USD',...source,basis:'GAAP reported',passage:passage.slice(0,200)});
  }
  // Conflicting contexts/duplicate values are withheld instead of selecting arbitrary facts.
  return facts.filter(f=>!facts.some(o=>o.metric===f.metric&&o.periodStart===f.periodStart&&o.periodEnd===f.periodEnd&&o.value!==f.value)).filter((f,i,all)=>all.findIndex(o=>o.metric===f.metric&&o.periodStart===f.periodStart&&o.periodEnd===f.periodEnd)===i);
}
export function releaseBridge(facts:ReleaseFact[],filedPeriodEnd:string|null){
  const newer=facts.filter(f=>filedPeriodEnd!==null&&f.periodEnd>filedPeriodEnd),end=newer.map(f=>f.periodEnd).sort().at(-1);
  return {status:newer.length?'partial' as const:'unavailable' as const,periodEnd:end??null,facts:newer.filter(f=>f.periodEnd===end),note:newer.length?'Tagged GAAP earnings-release figures, not yet in the selected periodic filing. Kept separate: no unreconciled TTM or balance-sheet substitution.':'No newer unambiguous tagged GAAP release facts. Untagged tables, guidance and non-GAAP figures are not substituted.'};
}