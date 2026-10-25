export function CreditMetric({credits,basis}:{credits:number|null|undefined;basis?:string|null|undefined}) {
  return <span className="font-mono text-[10px]">Lovable Credits Used <b className="text-primary">{credits===null||credits===undefined?'Not recorded':`${Number(credits).toFixed(4)} credits`}</b>{basis==='calculated'&&<span className="text-muted-foreground"> · calculated</span>}</span>;
}