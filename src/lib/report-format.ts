// Browser-safe helpers that make model-written report text easier to read without changing its meaning.

/** Splits very long paragraphs into shorter ones and bolds leading "Label:" phrases. */
export function formatReportText(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inCode = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) inCode = !inCode;
    if (inCode || /^\s*([#>|]|[-*+]\s|\d+[.)]\s)/.test(line) || line.length < 420) {
      out.push(boldLead(line, inCode));
      continue;
    }
    const sentences = line.match(/[^.!?]+(?:[.!?]+(?=\s+[A-Z(]|$)|$)/g)?.map(s => s.trim()).filter(Boolean) ?? [line];
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += 3) chunks.push(sentences.slice(i, i + 3).join(' '));
    out.push(chunks.map(c => boldLead(c, false)).join('\n\n'));
  }
  return out.join('\n');
}

function boldLead(line: string, inCode: boolean): string {
  if (inCode || line.includes('**')) return line;
  return line.replace(/^(\s*(?:[-*+]\s+)?)([A-Z][A-Za-z0-9 /&()'-]{2,40}):\s+(?=\S)/, '$1**$2:** ');
}

export type GlossaryEntry = { term: string; definition: string };

const GLOSSARY: [string, RegExp, string][] = [
  ['RSI (Relative Strength Index)', /\bRSI\b|relative strength index/i, 'Momentum measure on a 0–100 scale. Above 70 is often read as overbought and below 30 as oversold; strong trends can stay at extremes.'],
  ['MACD', /\bMACD\b/i, 'Moving Average Convergence Divergence: the 12-day minus 26-day exponential average, compared with a 9-day signal line. Crossing above the signal suggests improving momentum.'],
  ['SMA (Simple Moving Average)', /\bSMA\s?\d*|simple moving average|\b\d{2,3}-day (moving )?average/i, 'Average closing price over a set number of days (e.g. 50 or 200). Price above it suggests an uptrend; it lags price.'],
  ['EMA (Exponential Moving Average)', /\bEMA\b|exponential moving average/i, 'Moving average that gives more weight to recent prices, so it reacts faster than an SMA.'],
  ['Bollinger Bands', /bollinger/i, 'Bands two standard deviations around a 20-day average. Wide bands mean higher volatility; touching a band is not a reversal signal by itself.'],
  ['ATR (Average True Range)', /\bATR\b|average true range/i, 'Average daily price range over 14 days. Measures volatility, not direction.'],
  ['Support / Resistance', /\bsupport\b|\bresistance\b/i, 'Price levels where buying (support) or selling (resistance) has previously halted moves. They are observations, not guarantees.'],
  ['Golden / Death Cross', /golden cross|death cross/i, 'When the 50-day average crosses above (golden) or below (death) the 200-day average; a lagging trend signal.'],
  ['Volatility', /volatil/i, 'How much the price moves over time. Higher volatility means wider expected swings in either direction.'],
  ['Beta', /\bbeta\b/i, 'Sensitivity of the stock to the overall market. Beta above 1 tends to move more than the market; below 1 less.'],
  ['P/E (Price-to-Earnings)', /\bP\/E\b|price[- ]to[- ]earnings/i, 'Share price divided by earnings per share. Higher can mean expensive or high expected growth; meaningless when earnings are negative.'],
  ['Forward P/E', /forward P\/E/i, 'P/E using analysts’ expected future earnings rather than reported earnings.'],
  ['P/S (Price-to-Sales)', /\bP\/S\b|price[- ]to[- ]sales/i, 'Market value divided by revenue; useful for unprofitable companies but ignores margins and debt.'],
  ['EV/EBITDA', /EV\/EBITDA|\bEBITDA\b/i, 'Enterprise value (equity plus net debt) divided by earnings before interest, taxes, depreciation and amortization. A capital-structure-neutral valuation measure.'],
  ['EPS (Earnings per Share)', /\bEPS\b|earnings per share/i, 'Net income divided by shares outstanding; diluted EPS includes options and convertibles.'],
  ['Gross Margin', /gross margin/i, 'Gross profit as a share of revenue; shows production economics before overhead.'],
  ['Operating Margin', /operating margin/i, 'Operating income as a share of revenue; shows profitability of core operations.'],
  ['Net Margin', /net margin/i, 'Net income as a share of revenue; what is left after all costs, interest and taxes.'],
  ['Free Cash Flow', /free cash flow|\bFCF\b/i, 'Operating cash flow minus capital expenditure; cash available for debt, dividends and buybacks.'],
  ['ROE (Return on Equity)', /\bROE\b|return on equity/i, 'Net income divided by shareholder equity; can be inflated by high debt.'],
  ['Debt-to-Equity', /debt[- ]to[- ]equity|\bD\/E\b/i, 'Total debt divided by shareholder equity; higher values mean more financial leverage.'],
  ['Market Capitalization', /market cap/i, 'Share price times shares outstanding: the market value of the company’s equity.'],
  ['TTM (Trailing Twelve Months)', /\bTTM\b|trailing twelve/i, 'Sum of the last four reported quarters, giving a current annual figure.'],
  ['YoY / QoQ', /\bYoY\b|\bQoQ\b|year[- ]over[- ]year|quarter[- ]over[- ]quarter/i, 'Change versus the same period last year (YoY) or the previous quarter (QoQ).'],
  ['Guidance', /\bguidance\b/i, 'Management’s own forecast of future results; changes often move the share price.'],
  ['Catalyst', /catalyst/i, 'An upcoming event (earnings, product launch, ruling) that could move the share price.'],
  ['Conviction Score', /conviction/i, 'This report’s 0–100 confidence in its recommendation; it is not a probability of profit.'],
  ['Price Target', /price target|target price/i, 'The estimated share price the analysis expects over its horizon; an estimate, not a forecast guarantee.'],
  ['Bull / Bear Case', /\bbull(ish)?\b|\bbear(ish)?\b/i, 'Bull: arguments the price will rise. Bear: arguments it will fall.'],
  ['Sentiment', /sentiment/i, 'Overall tone of news or market participants toward the stock; here derived from dated headlines and market proxies, not measured social posts unless stated.'],
  ['Yield Curve', /yield curve|10y-2y|2s10s/i, 'Gap between long- and short-term government bond yields; an inverted curve has historically preceded slowdowns.'],
  ['Federal Funds Rate', /fed funds|federal funds/i, 'The US central bank’s policy interest rate, which influences borrowing costs and valuations.'],
  ['CPI / Inflation', /\bCPI\b|inflation/i, 'Consumer Price Index measures price changes; high inflation can lead to higher interest rates.'],
  ['Prediction Market', /prediction market|polymarket/i, 'Markets where traders bet on event outcomes; prices imply crowd probabilities, not certainties.'],
  ['10-K / 10-Q', /\b10-K\b|\b10-Q\b/i, 'Annual (10-K) and quarterly (10-Q) reports companies file with the US SEC.'],
  ['Hold / Buy / Sell Rating', /\b(HOLD|BUY|SELL)\b/, 'The report’s recommended action. Hold means maintain an existing position without adding or reducing.'],
];

/** Returns glossary entries for technical terms that actually appear in the report text. */
export function reportGlossary(text: string): GlossaryEntry[] {
  return GLOSSARY.filter(([, re]) => re.test(text)).map(([term, , definition]) => ({ term, definition }));
}
