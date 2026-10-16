# SwiftCart Agent Shopper

**Live demo:** [swiftcart-agent-shopper.onrender.com](https://swiftcart-agent-shopper.onrender.com)<br>
**Source:** [Seanjohn123-cyber/SwiftCart](https://github.com/Seanjohn123-cyber/SwiftCart)<br>
**Repo demo video:** [Download the trimmed MP4](public/swiftcart-demo.mp4)<br>
**Demo video:** _Add the public YouTube URL after recording a video under 3 minutes. Use no copyrighted music._

SwiftCart helps a budget-conscious runner find an in-stock shoe in the right size and price range, compare merchant offers, review an agent-proposed purchase, and approve payment through PayPal Sandbox.

## Features

- Searches a multi-merchant product catalog from natural-language constraints such as brand, category, size, color, budget, and shipping.
- Uses OpenAI function/tool calling to translate a shopper's request into search constraints. Application code searches and ranks real catalog items; AI cannot invent products, prices, stock, or sizes.
- Uses local catalog rules when `OPENAI_API_KEY` is not set or the model is unavailable. The Copilot UI reports the active mode.
- Proposes an item for the cart, then waits for the shopper to approve checkout.
- Creates PayPal Orders v2 orders from server-side product prices. Before capture, server code verifies the PayPal order status, item, SKU, currency, amount, stock, and quantity. AI cannot approve or capture a payment.
- Supports customer signup/sign-in and a PostgreSQL-backed purchase history. Signed-in checkouts are associated with the account at order creation; only completed, server-verified PayPal captures are saved. Guest checkout remains available.
- Provides seller and inventory screens, a webhook event viewer, multi-currency display, and service status checks.
- Offers an AI webhook review for verified PayPal events. It receives only an allowlisted subset of event fields and returns a human-review advisory; it cannot alter payment state.

**Target user and problem:** a budget-conscious runner who needs a specific shoe size under a spending limit and wants to compare in-stock offers before paying.

## Tools and PayPal/AI usage

- **Next.js App Router, React, Node.js:** storefront, seller and inventory views, API routes, and deployment runtime.
- **OpenAI Chat Completions function calling (optional):** the shopping agent calls `search_catalog` to extract structured constraints. The server runs the catalog search and checkout validation. The webhook page can ask the model for a non-actionable advisory on verified events.
- **PayPal JavaScript SDK and Orders v2 REST API:** Sandbox buyer approval, server-side order creation, and validated capture.
- **PayPal Webhooks API:** verifies webhook signatures before recording real events. A development-only simulator is available outside production.
- **Render:** hosts the full-stack Next.js app and its API routes.
- **Neon PostgreSQL:** customer accounts, checkout ownership, and purchase history. Inventory writes still use the app's local filesystem, which is ephemeral on Render.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
```

Create `.env.local` in the project root. Use your own PayPal Sandbox and OpenAI credentials; do not commit this file or paste secret values into chat. Generate a strong merchant token (at least 32 characters) for protected inventory imports.

```dotenv
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_rest_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_rest_client_secret
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id
MERCHANT_IMPORT_TOKEN=replace_with_a_random_token_of_at_least_32_characters
APP_BASE_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=your_neon_postgres_connection_string
CUSTOMER_SESSION_SECRET=replace_with_at_least_32_random_bytes
```

`OPENAI_API_KEY` is optional; without it, the local rules planner is used. PayPal credentials are required for checkout. `PAYPAL_WEBHOOK_ID` is required to verify PayPal webhook notifications. `MERCHANT_IMPORT_TOKEN` is required for merchant sign-in and server-to-server inventory imports. The merchant UI exchanges it for a one-hour, HttpOnly, SameSite=Strict session cookie; the token is not retained by the browser. In production, `APP_BASE_URL` must be your HTTPS site origin.

Customer signup and purchase history require a Neon PostgreSQL database. Create a database, copy its connection string into `DATABASE_URL`, and generate a separate session secret (for example, `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`). Set that value as `CUSTOMER_SESSION_SECRET`; never commit either value. The app creates the customer tables on first use. Customer passwords are scrypt-hashed, sessions are signed HttpOnly cookies, and purchases are linked to an account only when checkout starts while signed in. Email verification and password recovery are not enabled in this demo.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run checks with:

```bash
npm test
npm run lint
npm run build
```

## Deploy on Render

The repository includes `render.yaml` for a full-stack Node web service. Create a Blueprint from this repository and configure the PayPal Sandbox values, a strong `MERCHANT_IMPORT_TOKEN`, Neon `DATABASE_URL`, a generated `CUSTOMER_SESSION_SECRET`, and optionally `OPENAI_API_KEY` in Render's environment settings. Never put credentials in the Blueprint or source. Set `APP_BASE_URL` to the deployed HTTPS origin.

Set the PayPal Sandbox webhook listener URL to:

```text
https://<render-service>.onrender.com/api/webhooks/paypal
```

Subscribe to `PAYMENT.CAPTURE.COMPLETED` and optionally `CHECKOUT.ORDER.APPROVED`; set the matching `PAYPAL_WEBHOOK_ID` in Render. Rejected signature attempts are logged in the Webhooks tab without retaining the submitted payload. Webhook history, rate limits, and imported inventory use in-memory/local-file demo storage; they are not durable or shared across restarts or instances. Customer accounts and purchases use Neon PostgreSQL.

## Failure-path demo checklist

- **Cancelled checkout:** open the PayPal popup and cancel before approval; the page reports that no payment was captured.
- **Declined payment:** use a PayPal Sandbox buyer/payment method configured to decline; the UI reports the SDK or capture failure and does not show a successful receipt.
- **Duplicate webhook:** in local development, dispatch a simulated event and select **Replay last event**; the second response reports `duplicate: true` and does not add another event. The simulator is intentionally disabled in production.
- **Rejected webhook:** locally, POST a fake event without PayPal signature headers; it returns 401 and adds a payload-free **REJECTED** row to the Webhooks tab. The simulator is intentionally disabled in production.
- **AI webhook review:** expand an event marked PayPal verified and select **Review with AI**. Simulated events cannot be submitted for AI triage.

## Security notes

- `.env*` files are ignored by Git. Keep `PAYPAL_CLIENT_SECRET`, `OPENAI_API_KEY`, and `MERCHANT_IMPORT_TOKEN` server-side.
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is public-facing; the PayPal Client Secret is not.
- The app emits HSTS and standard content-type/referrer security headers. Render terminates HTTPS; the app refuses non-HTTPS/non-PayPal hosts for its PayPal REST API base.
- Merchant inventory writes accept either a server-to-server bearer token or a one-hour signed HttpOnly session cookie established by the merchant login. Login attempts are rate-limited; the browser never stores the configured token after login.
- PayPal webhook POSTs are verified against PayPal using the configured webhook ID before processing. Mock simulator events are clearly labeled and only accepted outside production.
- Agent search, checkout creation/capture, webhook receipt/AI review, and merchant login have per-process IP-based rate limits. These are demo safeguards, not a distributed limit for production deployments.
- PayPal capture responses must report `COMPLETED` and match the server-computed amount and currency before the app reports success. Order creation and capture use PayPal idempotency request IDs.
- Public health checks report configuration state only; they do not request or return access tokens.
- The PayPal integration is configured for Sandbox by default. Do not switch to live payments without a separate production review.

## License

MIT. See [LICENSE](LICENSE).
