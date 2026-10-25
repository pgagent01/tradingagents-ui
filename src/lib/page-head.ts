export function pageHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — TradingAgents AI` },
    { name: 'description', content: description },
    { property: 'og:title', content: `${title} — TradingAgents AI` },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] };
}