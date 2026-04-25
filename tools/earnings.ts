import { FunctionTool } from '@google/adk';
import { z } from 'zod';

const LUQMAN_API_URL = process.env.LUQMAN_API_URL ?? 'http://localhost:3001';
const LUQMAN_ACCESS_TOKEN = process.env.LUQMAN_ACCESS_TOKEN ?? '';
const LUQMAN_API_KEY = process.env.LUQMAN_API_KEY ?? '';

function authHeaders(): Record<string, string> {
  if (LUQMAN_ACCESS_TOKEN) return { Authorization: `Bearer ${LUQMAN_ACCESS_TOKEN}` };
  if (LUQMAN_API_KEY) return { 'X-API-Key': LUQMAN_API_KEY };
  throw new Error('No auth configured. Set LUQMAN_ACCESS_TOKEN or LUQMAN_API_KEY in .env');
}

/**
 * Calls GET /v1/earnings/:id on the Luqman backend.
 *
 * Reads the double-entry ledger — total credits to this researcher's
 * account, broken down by upload with retrieval counts.
 * Read-only. Does not trigger any payments.
 */
export const getResearcherEarnings = new FunctionTool({
  name: 'get_researcher_earnings',
  description:
    'Look up how much a researcher has earned from citations in the Luqman ' +
    'marketplace. Returns total USDC earnings and a breakdown per uploaded paper. ' +
    'Use this when the user asks about researcher payouts or citation revenue.',
  parameters: z.object({
    researcher_id: z
      .string()
      .uuid()
      .describe('The UUID of the researcher. Get this from the /v1/researchers list.'),
  }),
  execute: async ({ researcher_id }) => {
    try {
      const res = await fetch(`${LUQMAN_API_URL}/v1/earnings/${researcher_id}`, {
        headers: { ...authHeaders() },
      });

      if (res.status === 404) {
        return {
          status: 'error',
          error_message: `Researcher ${researcher_id} not found.`,
        };
      }

      if (!res.ok) {
        const err = await res.text();
        return {
          status: 'error',
          error_message: `Luqman API error (${res.status}): ${err}`,
        };
      }

      const data = await res.json() as {
        researcherId: string;
        displayName: string;
        walletAddress: string;
        totalEarningsUsdc: string;
        uploads: Array<{
          uploadId: string;
          title: string;
          tier: string;
          earningsUsdc: string;
          retrievalCount: number;
        }>;
      };

      return {
        status: 'success',
        researcher: data.displayName,
        wallet: data.walletAddress,
        total_earnings_usdc: data.totalEarningsUsdc,
        uploads: data.uploads.map((u) => ({
          title: u.title,
          tier: u.tier,
          earnings_usdc: u.earningsUsdc,
          times_cited: u.retrievalCount,
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
