import { useEffect,useRef } from 'react';
import { type Candle } from '@/lib/stock-data';

export function StockChart({candles,mode}:{candles:Candle[];mode:'line'|'candles'}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{let dispose:()=>void=()=>{};let cancelled=false;
    void import('lightweight-charts').then(({createChart,ColorType,LineSeries,CandlestickSeries,HistogramSeries})=>{
      if(cancelled||!ref.current)return;
      const css=getComputedStyle(document.documentElement);const color=(name:string)=>css.getPropertyValue(name).trim();
      const chart=createChart(ref.current,{autoSize:true,layout:{background:{type:ColorType.Solid,color:color('--background')},textColor:color('--muted-foreground')},grid:{vertLines:{color:color('--border')},horzLines:{color:color('--border')}},timeScale:{timeVisible:candles.length>0&&((candles[1]?.time??0)-(candles[0]?.time??0))<86400},rightPriceScale:{scaleMargins:{top:0.1,bottom:0.25}}});
      const points=candles.map(c=>({...c,time:c.time as import('lightweight-charts').UTCTimestamp}));
      if(mode==='candles'){const series=chart.addSeries(CandlestickSeries,{upColor:color('--positive'),downColor:color('--negative'),borderVisible:false,wickUpColor:color('--positive'),wickDownColor:color('--negative')});series.setData(points);}else{const series=chart.addSeries(LineSeries,{color:color('--primary'),lineWidth:2});series.setData(points.map(c=>({time:c.time,value:c.close})));}
      const volume=chart.addSeries(HistogramSeries,{priceScaleId:'volume',priceFormat:{type:'volume'}});volume.priceScale().applyOptions({scaleMargins:{top:0.8,bottom:0}});volume.setData(points.filter(c=>c.volume!==null).map(c=>({time:c.time,value:c.volume??0,color:c.close>=c.open?color('--positive'):color('--negative')})));chart.timeScale().fitContent();dispose=()=>chart.remove();
    });return()=>{cancelled=true;dispose();};
  },[candles,mode]);
  return <div ref={ref} className="h-[420px] w-full" aria-label="Interactive stock price and volume chart"/>;
}