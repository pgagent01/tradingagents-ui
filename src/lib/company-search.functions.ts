import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const searchCompanyBackup = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => z.object({ query: z.string().trim().min(2).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const { lookupCompanyFallback } = await import('./company-search.server');
    return lookupCompanyFallback(data.query);
  });