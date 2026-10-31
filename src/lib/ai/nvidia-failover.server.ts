import { MODEL_OPTIONS } from '@/lib/research-config';

export function nvidiaModelOrder(selected: string) {
  return [selected, ...MODEL_OPTIONS.filter(m => m.provider === 'nvidia' && m.model !== selected).map(m => m.model)].slice(0, 3);
}
// Only explicit transient HTTP failures before a stream starts are safe to replay.
// Quota, denial, invalid keys, refusals, network ambiguity and partial streams are terminal.
export function canFailoverNvidia(status: number) { return [500, 502, 503, 504].includes(status); }
export function createNvidiaFailoverFetch(selected: string, onFallback: (model: string) => Promise<void>, upstream: typeof fetch = fetch, wait: (ms: number, signal?: AbortSignal | null) => Promise<void> = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
  const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
  const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
  signal?.addEventListener('abort', abort, { once: true });
})) {
  let model = selected;
  return {
    getModel: () => model,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const candidates = nvidiaModelOrder(selected);
      for (let attempt = 0; attempt < candidates.length; attempt++) {
        const candidate = candidates[attempt];
        if (!candidate) break;
        model = candidate;
        const body = typeof init?.body === 'string' ? JSON.stringify({ ...JSON.parse(init.body), model }) : init?.body;
        const response = await upstream(input, { ...init, ...(body !== undefined ? { body } : {}) });
        if (!canFailoverNvidia(response.status) || attempt === candidates.length - 1) return response;
        await response.body?.cancel();
        await wait(1000 * 2 ** attempt, init?.signal);
        const next = candidates[attempt + 1];
        if (next) await onFallback(next);
      }
      throw new Error('NVIDIA model fallback exhausted.');
    },
  };
}