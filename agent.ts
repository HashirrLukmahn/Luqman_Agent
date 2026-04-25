import 'dotenv/config';
import { LlmAgent } from '@google/adk';
import { queryResearch } from './tools/query.js';
import { getResearcherEarnings } from './tools/earnings.js';

/**
 * Luqman research agent.
 *
 * Tools:
 *   query_research         → POST /v1/query   (retrieval + payments)
 *   get_researcher_earnings → GET  /v1/earnings/:id (read ledger)
 *
 * Auth:
 *   LUQMAN_API_KEY env var — issued by POST /v1/agents/register
 *   Scalekit bearer (auth/scalekit.ts) — wired in once Luqman backend
 *   swaps apiKey.ts for scalekit.ts middleware
 */
export const rootAgent = new LlmAgent({
  name: 'luqman_research_agent',
  model: 'gemini-2.0-flash',
  generateContentConfig: {
    temperature: 0.2,
    maxOutputTokens: 300,
  },
  description:
    'A research agent that queries the Luqman knowledge marketplace for ' +
    'unpublished negative research results. Pays researchers automatically ' +
    'per citation via Circle Nanopayments on Arc testnet.',
  instruction: `You are a research assistant with access to Luqman, a
knowledge marketplace for unpublished negative research results — failed
drug trials, ruled-out compounds, dead-end ML experiments, and failed
materials formulations.

When a user asks a research question:
1. Call query_research with a precise, specific query.
2. Present the answer clearly, citing the sources by number [1], [2], etc.
3. After the answer, ALWAYS render a payment receipt in this exact markdown format:

---

### 📄 Receipt · query \`<query_id>\`

**Total cost:** $<total_cost_usdc> USDC · **Sources:** <chunks_retrieved>

| # | Researcher | Paper | Tier | Paid | Transaction |
|---|------------|-------|------|------|-------------|
| 1 | <researcher_name, or "🔒 anonymous · Zeko: <commitment first 10 chars>…" if tier=dark> | <title truncated> | <tier: open / validated / 🟣 dark> | $<paid_usdc> | [<tx_hash first 10>…](<explorer_url>) |
| 2 | ... | ... | ... | ... | ... |

*Payments settled on Arc testnet. 🟣 Dark-tier identities are committed to Zeko Mina L2 — paid correctly without the model ever seeing who wrote the paper.*

---

Truncate tx_hash to first 10 chars followed by "…" but keep the full URL in the link.
Truncate paper titles to 50 chars if longer.

When a user asks about researcher earnings or payouts:
1. You need a researcher UUID — ask the user if you don't have it.
2. Call get_researcher_earnings with that UUID.
3. Present as a markdown table: Paper | Tier | Times cited | Earnings. Include
   total earnings at the top as a bold line.

Always be transparent about payments — users should know that real USDC
micropayments are being made to researchers as you cite their work.`,
  tools: [queryResearch, getResearcherEarnings],
});
