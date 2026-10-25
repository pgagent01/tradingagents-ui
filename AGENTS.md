<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Authenticate every account mutation with requireSupabaseAuth and scope queries to context.userId; roles never grant access to another user's credentials or research.
- API keys are encrypted with Web Crypto AES-GCM and decrypted only in server helpers; server functions never return plaintext keys.
- Use shared company matching and research configuration modules for dashboard/wizard behavior and role-specific USD estimates.
- Store demo execution progress in Lovable Cloud and advance one atomic locked step per request; demo mode never calls an LLM and costs are labeled hypothetical.
- Snapshot run token totals and USD cost into each report on insert; report views use the report snapshot rather than account-wide totals.
- Keep /new-analysis as a compatibility redirect to /analysis/new; /analysis/$id owns execution and redirects completed runs to the report-first /reports/$id viewer.
