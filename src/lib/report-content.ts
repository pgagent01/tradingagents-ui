import type { Database } from '@/integrations/supabase/types';
import { COMPANIES } from '@/lib/companies';
export type Report = Database['public']['Tables']['research_reports']['Row'];
export type AnalystOutput = Pick<Database['public']['Tables']['agent_outputs']['Row'],'agent_id'|'content'|'model_used'|'status'>;
export const RECOMMENDATIONS=['STRONG BUY','BUY','HOLD','SELL','STRONG SELL'] as const;
export const ANALYST_SECTIONS=[
  { id:'fundamental',title:'Fundamental Analysis',keys:['fundamental_analysis','fundamentals','fundamental_report'],agents:['fundamentals','fundamentals_analyst','fundamental_analyst'] },
  { id:'technical',title:'Technical Analysis',keys:['technical_analysis','technical','market_report'],agents:['technical','market_analyst','technical_analyst'] },
  { id:'sentiment',title:'Sentiment & News',keys:['sentiment_news','sentiment','news','sentiment_report','news_report'],agents:['sentiment','news','social_analyst','news_analyst'] },
  { id:'risk',title:'Risk & Debate',keys:['risk_debate','risk','debate','investment_debate_state','risk_debate_state'],agents:['risk','debate','risk_management','bull_researcher','bear_researcher','risk_manager'] },
] as const;
export function companyName(ticker:string) { return COMPANIES.find(c=>c.ticker===ticker)?.name ?? ticker; }
export function sectionObject(value:unknown):Record<string,unknown> { return value && typeof value==='object' && !Array.isArray(value)?value as Record<string,unknown>:{}; }
export function contentText(value:unknown):string {
  if(value===null||value===undefined) return '';
  if(typeof value==='string') return value;
  if(typeof value==='number'||typeof value==='boolean') return String(value);
  if(Array.isArray(value)) return value.map(v => `- ${contentText(v)}`).join('\n');
  return Object.entries(sectionObject(value)).map(([k,v])=>`### ${k.replace(/_/g,' ')}\n\n${contentText(v)}`).join('\n\n');
}
export function analystContent(sections:unknown,outputs:AnalystOutput[],group:typeof ANALYST_SECTIONS[number]) {
  const s=sectionObject(sections);
  const structured=group.keys.map(k=>contentText(s[k])).filter(Boolean).join('\n\n');
  if(structured) return structured;
  return outputs.filter(o=>group.agents.some(a=>a===o.agent_id)&&o.content).map(o=>`### ${o.agent_id.replace(/_/g,' ')}\n\n${o.content}`).join('\n\n');
}
export function financialRows(value:unknown):{metric:string;value:string}[] {
  if(Array.isArray(value)) return value.map((v,i)=>{
    const row=sectionObject(v);
    return {metric:String(row['metric'] ?? row['label'] ?? row['name'] ?? `Metric ${i+1}`),value:contentText(row['value'] ?? row['amount'] ?? v)};
  });
  return Object.entries(sectionObject(value)).map(([k,v])=>({metric:k.replace(/_/g,' '),value:contentText(v)}));
}
export function reportMarkdown(report:Report,outputs:AnalystOutput[],demo:boolean) {
  const s=sectionObject(report.sections);
  const metadata=`Date: ${report.created_at}\nRecommendation: ${report.recommendation ?? 'Not provided'}\nTarget price: ${report.price_target ?? 'Not provided'}\nConviction: ${report.conviction_score ?? 'Not provided'}\nRisk: ${report.risk_level ?? contentText(s['risk_level']) || 'Not provided'}`;
  const tokens=`Input: ${report.total_input_tokens} | Output: ${report.total_output_tokens} | Total: ${report.total_input_tokens+report.total_output_tokens} | ${demo?'Hypothetical':'Calculated'} cost USD: $${Number(report.total_cost_usd).toFixed(4)}`;
  const analysis=ANALYST_SECTIONS.map(group=>`## ${group.title}\n\n${analystContent(report.sections,outputs,group)||'Not provided in this report.'}`).join('\n\n');
  const rest=[['Catalysts','catalysts'],['Upside potential','upside_risks'],['Downside risks','downside_risks'],['Financial snapshot','financial_snapshot'],['Final synthesis','final_synthesis']].map(([title,key])=>`## ${title}\n\n${contentText(s[key ?? ''])||'Not provided in this report.'}`).join('\n\n');
  return `# ${report.ticker} — ${companyName(report.ticker)}\n\n${demo?'DEMO ONLY — mock outputs, no market data or investment recommendation. Actual charge $0.\n\n':''}${metadata}\n\n${tokens}\n\n## Executive summary\n\n${report.executive_summary ?? 'Not provided.'}\n\n${analysis}\n\n${rest}`;
}
export function filterReports<T extends Pick<Report,'ticker'|'recommendation'|'created_at'>>(reports:T[],filters:{q:string;recommendation:string;from:string;to:string}) {
  const q=filters.q.trim().toLowerCase();
  return reports.filter(r=>(!q||`${r.ticker} ${companyName(r.ticker)}`.toLowerCase().includes(q))&&(!filters.recommendation||r.recommendation===filters.recommendation)&&(!filters.from||r.created_at.slice(0,10)>=filters.from)&&(!filters.to||r.created_at.slice(0,10)<=filters.to));
}