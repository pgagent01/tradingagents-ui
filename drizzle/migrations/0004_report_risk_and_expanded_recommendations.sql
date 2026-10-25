ALTER TABLE public.research_reports ADD COLUMN risk_level text;
ALTER TABLE public.research_reports DROP CONSTRAINT research_reports_recommendation_check;
ALTER TABLE public.research_reports ADD CONSTRAINT research_reports_recommendation_check CHECK (recommendation IN ('BUY','HOLD','SELL','STRONG BUY','STRONG SELL'));
COMMENT ON COLUMN public.research_reports.sections IS 'Report sections: fundamental_analysis, technical_analysis, sentiment_news, risk_debate, catalysts, upside_risks, downside_risks, financial_snapshot, final_synthesis. Values are markdown text, arrays or structured objects.';