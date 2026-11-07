const definitions: [RegExp, string][] = [
  [/^rsi/, 'Relative Strength Index measures recent momentum on a 0–100 scale. Above 70 can indicate overbought conditions; below 30 can indicate oversold conditions. Strong trends can stay at these extremes; neither is a standalone buy/sell signal.'],
  [/^macd/, 'MACD is the 12-period minus 26-period exponential moving average, with a 9-period signal line. A move above the signal suggests strengthening momentum; below suggests weakening momentum. The histogram is MACD minus signal; crossovers can give false signals.'],
  [/^sma/, 'Simple moving average: the average closing price across the stated number of daily observations. Price above it can indicate an upward trend; below it a downward trend. It lags price and is not guaranteed support or resistance.'],
  [/^bollinger/, 'Bollinger Bands surround a 20-period average at two standard deviations. Wider bands suggest higher volatility; narrow bands a compression. Touching a band does not by itself imply a reversal.'],
  [/^atr/, 'Average True Range measures daily price volatility over 14 periods in price units, not direction. Compare ATR with the share price; higher relative ATR suggests wider potential price swings.'],
  [/^p\/e|price.*earnings/, 'Price-to-earnings compares market value with earnings. Lower values can imply cheaper valuation or weaker growth prospects. Compare similar companies and periods; losses make P/E uninformative. FY earnings are not TTM earnings.'],
  [/^p\/s|price.*sales/, 'Price-to-sales compares market value with revenue. It helps compare firms without profits but ignores margins and debt. Compare peers and the same financial period.'],
  [/^ev.*ebitda/, 'Enterprise value divided by EBITDA compares the business value, including net debt, with operating earnings before interest, taxes, depreciation and amortization. Lower is not automatically better; EBITDA excludes capital spending and can be adjusted differently.'],
  [/^net margin/, 'Net income divided by revenue, as a percentage. Higher margins mean more sales become profit; negative margins mean a loss. One-time items and industry differences matter.'],
  [/^roe/, 'Return on equity is net income divided by shareholder equity. Higher values can suggest efficient capital use, but leverage or very small equity can inflate it. Quarter values here are not annualized; year-end equity is not average equity.'],
  [/revenue growth/, 'Change in revenue against the comparable prior-year period. Positive growth indicates rising sales, but acquisitions, currency and a low comparison base can distort it.'],
  [/^revenue/, 'Sales earned during the stated period before expenses. Compare annual with annual or quarter with the matching prior-year quarter; rising sales do not guarantee profits.'],
  [/gross profit/, 'Revenue less cost of sales. Compare gross margin (gross profit divided by revenue) across similar periods to assess production economics; this excludes many overhead costs.'],
  [/operating income/, 'Profit after operating expenses but before interest and taxes. It helps assess core operations; unusual charges and accounting differences may affect comparisons.'],
  [/net income/, 'Profit or loss after expenses, interest and taxes. Positive values indicate profit; compare recurring earnings separately from one-time gains or charges.'],
  [/eps/, 'Diluted earnings per share divides earnings by shares including potential dilution. Growth can reflect higher profit or fewer shares; compare consistent periods and adjusted versus reported figures.'],
  [/free cash flow/, 'Operating cash flow less capital expenditure. Positive values can support debt repayment and shareholder returns; definitions vary and one strong period may not be sustainable.'],
  [/operating cash flow/, 'Cash generated or used by business operations. Persistent cash generation supports financial resilience; working-capital timing can temporarily boost or reduce it.'],
  [/investing cash flow/, 'Cash spent or received on investments and long-lived assets. Negative values often reflect investment for growth, not necessarily poor performance.'],
  [/financing cash flow/, 'Cash from debt, share issuance, repayments, dividends and buybacks. Positive values can mean new borrowing; negative values can mean repayments or shareholder distributions.'],
  [/assets/, 'Resources owned or controlled by the company. Assess their composition and returns; larger assets alone do not mean a stronger business.'],
  [/liabilities/, 'Amounts owed and other financial obligations. Compare with cash, assets, equity and cash generation to assess resilience; liabilities are not all interest-bearing debt.'],
  [/equity/, 'Assets minus liabilities attributable to shareholders. Negative or very small equity complicates book-value and ROE comparisons; book value is not market value.'],
  [/debt/, 'Borrowings due beyond one year. Compare with cash and recurring cash flow to assess repayment capacity; maturity dates and interest costs also matter.'],
  [/^cash/, 'Cash and highly liquid equivalents available at the period end. Compare with debt and upcoming obligations; some cash may be restricted.'],
  [/market cap/, 'Share price multiplied by outstanding shares: the market value of equity, not the full business value. It changes with price and share count.'],
  [/52.week range/, 'Lowest and highest observed share prices over the preceding 52 weeks. This describes past trading, not future support, resistance or a price forecast.'],
  [/volume/, 'Number of shares traded during the stated session or averaged over the stated window. Unusually high volume can confirm attention but does not show buying versus selling sentiment by itself.'],
];
export function metricGuidance(label: string): string | undefined {
  const normalized = label.replace(/_/g, ' ').trim().toLowerCase();
  return definitions.find(([pattern]) => pattern.test(normalized))?.[1];
}