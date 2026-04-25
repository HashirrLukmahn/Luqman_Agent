import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

const LUQMAN_API_URL = process.env.LUQMAN_API_URL ?? 'http://localhost:3001';
const LUQMAN_ACCESS_TOKEN = process.env.LUQMAN_ACCESS_TOKEN ?? '';
const LUQMAN_API_KEY = process.env.LUQMAN_API_KEY ?? '';

/**
 * Build auth headers.
 * Priority:
 *  1. Bearer token (Scalekit JWT) — production / demo path.
 *     Get it: log in at http://localhost:3000/api/auth/login, copy
 *     the `luqman_access_token` cookie into LUQMAN_ACCESS_TOKEN.
 *  2. X-API-Key — quick dev/test path (ALLOW_API_KEY=1 on backend).
 *     Get it: curl -s -X POST http://localhost:3001/v1/agents/register \
 *               -H "Content-Type: application/json" \
 *               -d '{"agentId":"my-agent"}' | jq -r .apiKey
 */
function authHeaders(): Record<string, string> {
  if (LUQMAN_ACCESS_TOKEN) return { Authorization: `Bearer ${LUQMAN_ACCESS_TOKEN}` };
  if (LUQMAN_API_KEY) return { 'X-API-Key': LUQMAN_API_KEY };
  throw new Error('No auth configured. Set LUQMAN_ACCESS_TOKEN or LUQMAN_API_KEY in .env');
}

/**
 * Calls POST /v1/query on the Luqman backend.
 *
 * The backend handles everything internally:
 *   - Gemini function-calling retrieval loop
 *   - Zeko access proof + work proof anchoring
 *   - Circle Nanopayments per citation (85% researcher / 15% platform)
 *
 * The agent just sends a question and gets back an answer with receipts.
 */
export const queryResearch = new FunctionTool({
  name: 'query_research',
  description:
    'Search the Luqman knowledge marketplace for unpublished research results. ' +
    'Returns an AI-synthesized answer with citations. Each citation triggers an ' +
    'on-chain USDC micropayment to the researcher. Use this when the user asks ' +
    'any scientific or research question.',
  parameters: z.object({
    query: z
      .string()
      .describe('The research question to answer. Be specific — e.g. "Why does XYZ-441 fail phase I hepatotoxicity screens?"'),
    max_chunks: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(20)
      .describe('Maximum number of knowledge chunks to retrieve. Default 20.'),
    max_price_usdc: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.25)
      .describe('Maximum total spend in USDC for this query. Default $0.25.'),
  }),
  execute: async ({ query, max_chunks, max_price_usdc }) => {
    try {
      const res = await fetch(`${LUQMAN_API_URL}/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          'Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify({
          query,
          max_chunks: max_chunks ?? 20,
          max_price_usdc: max_price_usdc ?? 0.25,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return {
          status: 'error',
          error_message: `Luqman API error (${res.status}): ${err}`,
        };
      }

      const data = await res.json() as {
        query_id: string;
        answer: string;
        citations: Array<{
          chunk_id: string;
          citation_number: number;
          researcher_name: string;
          upload_title: string;
          snippet: string;
          price_usdc: string;
          researcher_share_usdc: string;
          tx_hash: string;
          block_explorer_url: string;
        }>;
        total_cost_usdc: string;
        chunks_retrieved: number;
      };

      return {
        status: 'success',
        query_id: data.query_id,
        answer: data.answer,
        total_cost_usdc: data.total_cost_usdc,
        chunks_retrieved: data.chunks_retrieved,
        citations: data.citations.map((c) => ({
          number: c.citation_number,
          title: c.upload_title,
          researcher: c.researcher_name,
          snippet: c.snippet,
          paid_usdc: c.researcher_share_usdc,
          tx_hash: c.tx_hash,
          explorer: c.block_explorer_url,
        })),
      };
    } catch (err) {
      return {
        status: 'error',
        error_message: `Network error: ${(err as Error).message}`,
      };
    }
  },
});
