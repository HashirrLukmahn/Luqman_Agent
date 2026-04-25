/**
 * auth/scalekit.ts — NOT USED BY THE AGENT DIRECTLY
 *
 * The luqman-agent does not call Scalekit. Auth works like this:
 *
 *   1. A human researcher logs in at http://localhost:3000/api/auth/login
 *      (Scalekit-hosted login page → OAuth code exchange → JWT issued)
 *
 *   2. The JWT (access token) is stored as the `luqman_access_token` cookie
 *      in the web app, and copied into LUQMAN_ACCESS_TOKEN in this repo's .env
 *
 *   3. The agent's tools (tools/query.ts, tools/earnings.ts) attach:
 *        Authorization: Bearer <LUQMAN_ACCESS_TOKEN>
 *      to every request to the Luqman API
 *
 *   4. The Luqman Fastify backend verifies the JWT using:
 *        scalekit.validateAccessToken(token)
 *      (apps/api/src/middleware/apiKey.ts)
 *
 * If you later add tools that call THIRD-PARTY providers (Gmail, Slack, etc.)
 * via Scalekit Agent Auth, the SDK initialisation you'd need is:
 *
 *   import { ScalekitClient } from '@scalekit-sdk/node';
 *   const scalekit = new ScalekitClient(
 *     process.env.SCALEKIT_ENVIRONMENT_URL!,
 *     process.env.SCALEKIT_CLIENT_ID!,
 *     process.env.SCALEKIT_CLIENT_SECRET!,
 *   );
 *   const actions = scalekit.actions;
 *   // actions.getOrCreateConnectedAccount(...)
 *   // actions.getAuthorizationLink(...)
 *   // actions.executeTool(...)
 */
