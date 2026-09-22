# COCOTRIBE

A responsive English/Malayalam coconut pre-booking application built with **Next.js App Router, React, TypeScript, Tailwind CSS, PostgreSQL, Prisma and Razorpay**. Includes original coconut imagery, locally served English/Malayalam fonts and a protected administration area.

## Delivery status

The full source, database migration, seed, booking backend, admin tools and payment integration are included. The default preview is deliberately in **DEMO_MODE**: sample prices are labelled and no real bookings, contact submissions or payments are accepted. This is not yet a live merchant deployment.

Confirmed contact: **+91 94966 69360**, used for phone and WhatsApp. Confirm the address/collection point, email, hours, actual prices, stock, refund terms and delivery arrangements before launch. The seed uses ₹40 and ₹120 as sample prices, not quotations. All default products are sold per piece; add a unit model before selling copra by kilogram.

## Quick start: visual preview

Requirements: Node.js 20.19+ (Node 22 LTS recommended) and npm. Use the committed lockfile.

```sh
npm ci
cp .env.example .env
npm run db:generate
npm run dev
```

On Windows, use `Copy-Item .env.example .env`. Open the exact local URL printed by Next.js. No database is required in preview mode. The language switcher persists on the current device. Customer pages, product quantities, enquiry links and the review step work in preview; submission explains that booking is not yet enabled.

## Enable the database and real booking workflows

For local PostgreSQL, optionally run:

```sh
docker compose up -d db
```

Alternatively use an existing PostgreSQL 17+ installation or managed PostgreSQL. Create a **dedicated** database and configure `DATABASE_URL`. Use TLS for hosted connections, a least-privilege runtime database user and a separate migration credential if your host supports it. The Docker password is for local development only; never use it in production.

1. Generate a strong random `SESSION_SECRET` (48+ characters):
   ```sh
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. Set `APP_URL` to the exact browser origin, including port in development. For example `http://127.0.0.1:3000`. Mutation endpoints reject a different Origin. If you use `localhost`, use it consistently.
3. Apply and seed:
   ```sh
   npm run db:migrate
   npm run db:seed
   ```
4. Set `DEMO_MODE=false` and restart Next.js. This enables real durable bookings and contact enquiries. Do this only in your intended test or live database. Missing database configuration fails visibly; the app never silently converts live orders into sample data.
5. Configure the admin account below, verify all settings, and make a Pay at Delivery test booking.

The seed is idempotent and does not overwrite existing product prices or content.

## Admin credentials

There is **no default admin account or password**. Set temporary `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 14 characters in your shell, then run:

```sh
npm run admin:create
```

The command reads shell environment variables. If using a `.env` file, Node 20.19+ can load it explicitly:

```sh
node --env-file=.env --import tsx scripts/create-admin.ts
```

Remove `ADMIN_PASSWORD` after account creation. Sign in at `/admin/login`. Running the command for an existing email rotates the password and revokes its sessions. Sign-out revokes all sessions for that account. Sessions expire after eight hours; cookies are HttpOnly, SameSite=Strict and Secure in production. Use HTTPS for production admin access.

Admin features:

- Today/upcoming/total/pending/paid/Pay at Delivery counts.
- Booking search by name, phone or ID; date, payment and order-status filters; pagination; full order notes and contact links.
- Order transitions: Pending → Confirmed → Preparing → Ready → Completed. Pending through Ready can be cancelled. Completed/Cancelled cannot reopen.
- Products, bilingual descriptions, prices in **paise**, active status and unreserved stock.
- Time slots, start times in IST, active status and per-day booking capacity.
- Bilingual FAQs and display order.
- Bilingual hero/about/contact/hours content, phone, WhatsApp, email, advance notice, booking horizon and Pay at Delivery availability.
- Contact-message inbox (latest 100 submissions) and audit records for admin edits.

To add product photographs, place optimised JPG/WebP files in `public/images`, deploy them, then set their `/images/filename.jpg` path in the product editor. Media upload is intentionally not exposed. Image paths are restricted to the local image directory.

## Razorpay setup

1. Create/activate your own Razorpay merchant account and generate **test** keys first.
2. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and a separate random `RAZORPAY_WEBHOOK_SECRET` as server secrets. Never prefix them with `NEXT_PUBLIC_` or commit them.
3. Enable automatic payment capture in Razorpay.
4. Add an HTTPS webhook for `https://YOUR-DOMAIN/api/payments/webhook`; subscribe to **payment.captured**, using the same webhook secret as the server.
5. Test successful checkout, failed/cancelled checkout, delayed webhook, duplicate webhook and a cancelled order receiving a late payment. A public HTTPS test deployment or trusted tunnel is needed for real webhook delivery; a localhost URL alone is insufficient.
6. Switch both key ID and key secret to live credentials only after test-mode verification, merchant approval and launch checks.

The server calculates totals from database prices and checks the price the customer reviewed. Stock and slot capacity are reserved in serializable transactions. It creates the Razorpay order server-side. Checkout signatures are verified against the stored order ID, then the payment is fetched from Razorpay and must be **captured**, match the amount and use INR. The webhook verifies its HMAC over the raw request body. Duplicate callbacks are idempotent. Merely opening or returning from checkout does not mark a booking paid.

Unpaid online reservations expire after 30 minutes. **Schedule `npm run payments:reconcile` every five minutes** on the server with its runtime environment. If loading a local environment file explicitly:

```sh
node --env-file=.env --import tsx scripts/reconcile.ts
```

The job checks Razorpay before releasing stock. Authorised payments remain reserved while awaiting capture. Gateway errors fail closed and need monitoring/retry. The job also removes expired rate-limit buckets. Run only one scheduled instance at a time. On serverless hosting, use a separate managed scheduled job that can run this command with the same database and gateway secrets.

Late captured payments for cancelled bookings become `REFUND_REQUIRED` and do not trigger fulfilment. Process the refund in the Razorpay dashboard, then record `REFUNDED` in admin. **Automatic refund initiation is not implemented.** Reconcile refund amounts manually before updating the record. Pay at Delivery can be marked paid by an admin after collection; online payment status cannot be manually changed to paid.

Official references: [Razorpay Node integration](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/) and [webhook validation](https://razorpay.com/docs/webhooks/validate-test/).

## Deployment

This source uses the requested standard **Next.js Node runtime and native PostgreSQL Prisma client**. Deploy to a Node-compatible provider (for example Vercel with managed PostgreSQL, or a VPS/container). The bundled Sites hosting runtime is a Cloudflare Worker without the raw PostgreSQL TCP access used here; do not deploy this Node build as a Worker or publish a static-only replacement and expect bookings to work.

### Node server / container

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

The seed is normally run once. Run migrations as a deployment release step, not from every application instance. Provide all secrets through the hosting provider. Put an HTTPS reverse proxy in front of the Node server. `APP_URL` must match the customer-facing origin. Keep the database private. Back up PostgreSQL and test restoration.

A multi-stage `Dockerfile` is included. Build with `docker build -t koko-tribe .` and run with your environment file or provider secrets. Do not use the example database password. Migration and scheduler commands require the full project/tools in a separate release/job environment; the final standalone web image contains only what serves requests.

### Vercel or another managed Next.js host

Import the source into your repository, select Next.js, configure the environment values, connect managed PostgreSQL and run migrations from a secure release job. Set build command to `npm run build`. Use a pooled connection string appropriate to your database provider for serverless execution and a direct migration connection when required. Schedule reconciliation on a separate job runner. Configure the production domain before setting `APP_URL` and Razorpay webhook URLs. Test cross-origin rejection after proxy/domain setup.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

Database concurrency tests require a **disposable database named `koko_test`**, the schema migrated, `DATABASE_URL` pointed to it and `RUN_DATABASE_TESTS=1`:

```sh
npm run test:integration
```

Tests create isolated product/slot/order records and remove their own fixtures. Never run integration tests against customer data. The HTTP smoke test (`tests/http-smoke.ts`) similarly requires an isolated test server and database; see its environment checks.

## Architecture

```text
src/app/                  Customer routes, admin routes and API routes
src/components/           Bilingual UI, booking, product, content and admin components
src/lib/                  Validation, PostgreSQL access, auth, payments, transactions
prisma/schema.prisma      PostgreSQL models and enums
prisma/migrations/        Versioned initial SQL migration
prisma/seed.ts            Editable bilingual sample catalogue and FAQs
scripts/                  Admin provisioning and payment reconciliation
tests/                    Domain, database and HTTP checks
public/images/            Optimised original photography
```

Booking confirmation links use an unguessable token in the URL **fragment**, kept out of normal server request logs. The API receives it in an Authorization header; only its hash is stored. Keep these links private. WhatsApp buttons prepare messages; customers choose whether to send them. No messages are sent automatically. Contact messages are stored for staff review; email/SMS delivery is not configured.

## Launch checklist

- Confirm sample prices, per-piece units, stock and realistic time-slot capacity.
- Enter full business address, collection location, email, hours and actual delivery policy.
- Review bilingual copy and terms/privacy/refund wording with the business owner; replace provisional policies where needed.
- Complete Razorpay test-mode checkout and webhook testing with your own account; then test a small live transaction and refund.
- Configure HTTPS, production secrets, database backups, monitoring and the reconciliation schedule.
- Create a unique admin password and remove provisioning secrets.
- Verify a customer booking, admin update, private confirmation page and printed summary on phone and desktop.
- Set `DEMO_MODE=false` only when ready to accept customer orders.

Brand visuals are AI-generated illustrative product photography, not documentation of a particular farm, product batch or temple. No temple affiliation is claimed.

## Reference design revision

The user selected COCOTRIBE as the final name. The homepage reproduces the supplied reference’s compact layout, wording, inline booking, four product/enquiry cards, services, payment artwork and footer. Cropped reference artwork is displayed as CSS image regions; all navigation, text, forms and booking actions are real components. Email and address are transcribed from the user-supplied reference and must be confirmed before launch. The separately generated hero is a visual reconstruction rather than the original photograph. The reference’s ₹38 bulk price is sample enquiry copy, not a checkout price.
