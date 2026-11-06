# COCOTRIBE deployment runbook

Hosting: **Vercel** (Next.js), **Supabase** (PostgreSQL), **Razorpay** (online payments).
The Vercel project auto-deploys `main` to production. **Pushing to `main` is a production release.**

## 1. Environment variables

Set these in **Vercel > Project > Settings > Environment Variables** (Production scope). Vercel encrypts them. Never commit them or prefix them with `NEXT_PUBLIC_`.

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase **transaction pooler**, port 6543, with `?pgbouncer=true&connection_limit=3&pool_timeout=20&sslmode=require`. URL-encode the password. |
| `DIRECT_URL` | Yes | Supabase **session pooler**, port 5432, with `?sslmode=require`. Used for migrations. |
| `APP_URL` | Yes | Final origin with no path, such as `https://cocotribe.vercel.app`. Browser requests from any other origin are refused. |
| `SESSION_SECRET` | Yes | 48+ random characters. Changing it signs admins out. |
| `DEMO_MODE` | Yes | `false` |
| `CRON_SECRET` | Yes (new) | 32+ random characters. Protects `/api/cron/reconcile` and detailed `/api/health`. |
| `RAZORPAY_KEY_ID` | For online payment | `rzp_test_…` until launch, then `rzp_live_…` |
| `RAZORPAY_KEY_SECRET` | For online payment | Secret paired with the key ID |
| `RAZORPAY_WEBHOOK_SECRET` | For online payment | Separate random value, the same as in the Razorpay webhook |
| `SENTRY_DSN` | Optional | Sentry project DSN for error alerts. Errors always go to Vercel logs. |

Generate a random secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are **not** Vercel variables. They are only used on your machine when creating an admin.

After changing a variable, redeploy: it only applies to new deployments.

## 2. Database migrations

Run from a trusted machine **before** deploying code that needs the new schema. `.env` must hold the production `DATABASE_URL` and `DIRECT_URL`.

```bash
npx prisma migrate status
```

```bash
npm run db:migrate
```

- `migrate deploy` only applies pending migrations. **Never run `prisma migrate reset` or `db push` on production.**
- `202611060001_audit_details_job_runs` is additive: one nullable column, one new table, four indexes and row-level security on two tables. It changes and deletes no existing data, and the currently running site keeps working with it.
- Do not re-run `prisma/seed.ts` or `scripts/update-product-catalog.ts` on production unless intended. Neither resets existing stock, but the catalogue script changes which products are active.

## 3. Admin accounts

Creating an account or changing a password uses the same command. **Use the existing email to rotate a password**: a different email adds a second account and leaves the old one working.

In PowerShell, from the project folder:

```powershell
$env:ADMIN_EMAIL = "your-admin-email"
$secure = Read-Host "New password (14+ characters)" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $secure).Password
node --env-file=.env --import tsx scripts/create-admin.ts
Remove-Item Env:ADMIN_PASSWORD
```

This revokes existing sessions for that account. Keep `ADMIN_PASSWORD` out of `.env`.

## 4. Razorpay

1. In **Test mode**, create keys and set them in Vercel.
2. **Account & Settings > Payment capture**: set **automatic capture**.
3. **Account & Settings > Webhooks > Add**:
   - URL: `https://YOUR-DOMAIN/api/payments/webhook`
   - Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`
   - Event: `payment.captured`
4. In Admin > Website settings, enable online payment.
5. On the deployed site, test success, failure, closing the checkout, paying again from the receipt, and that the webhook shows delivered (200) in Razorpay.
6. To go live: repeat steps 1–3 in **Live mode** (keys and webhooks are separate per mode), update the three Vercel variables, redeploy, and make one small real payment and refund. **Only you should do this.**

## 5. Scheduled reconciliation

Unpaid online reservations hold stock for 30 minutes. `/api/cron/reconcile` then asks Razorpay what happened: captured payments are marked paid, authorised ones stay held, and the rest release their stock. It is safe to run repeatedly or concurrently. Calls need `Authorization: Bearer <CRON_SECRET>`.

Pick one schedule:

| Option | How | Notes |
|---|---|---|
| **Vercel Pro (recommended)** | In `vercel.json` set `"schedule": "*/5 * * * *"`, redeploy, disable the GitHub workflow | Vercel sends `CRON_SECRET` automatically. Hobby's terms cover non-commercial use only, and Hobby rejects sub-daily crons. |
| GitHub Actions | `.github/workflows/reconcile.yml` (every 10 minutes). Add repository secrets `APP_URL` and `CRON_SECRET` | Free on public repos. On a private repo every 10 minutes uses about 4,300 of 2,000 free minutes a month, so use `*/30`. GitHub may delay runs and pauses schedules after 60 days without repo activity. |
| Supabase Cron | `pg_cron` + `pg_net` calling the endpoint | Free on every plan. Store the secret in Supabase Vault. |

`vercel.json` ships with a **daily** cron so that it deploys on any plan. That alone is a safety net, not a sufficient schedule.

**Monitoring**

- **Admin > Audit log** shows the last successful run and any problem.
- `GET /api/health` with `Authorization: Bearer <CRON_SECRET>` returns 503 if no success in 30 minutes or reservations are overdue. Without the header it reports only whether the site and database are up. Point an uptime monitor at it.
- A failed GitHub run emails the repository owner. Vercel shows cron runs under **Settings > Cron Jobs** and in its logs.

Manual run: `node --env-file=.env --import tsx scripts/reconcile.ts`

## 6. Backups, HTTPS, monitoring

- **Backups:** Supabase Pro has daily backups (add point-in-time recovery for less data loss). The Free plan has none you can rely on. In that case use `.github/workflows/backup.yml` with secrets `BACKUP_DATABASE_URL` and `BACKUP_PASSPHRASE`; dumps are encrypted before upload. Test a restore into a scratch database.
- **HTTPS:** automatic on Vercel. For a custom domain, add it in **Settings > Domains**, make it primary, then update `APP_URL` and the Razorpay webhook, and redeploy.
- **Errors:** logged as JSON to Vercel logs without raw messages or customer data. Set `SENTRY_DSN` for alerts.
- **Caching:** admin, booking, payment and API responses are `private, no-store`. Images have a 7-day cache. Catalogue data is cached for 30 seconds and refreshed immediately when an admin saves or a booking is made.
- **Region:** `vercel.json` runs functions in `hnd1` (Tokyo) beside the database. Moving Supabase to Mumbai and the functions to `bom1` would be faster for customers in India, but it is a data migration, so plan it separately.

## 7. Release and redeploy

```bash
npm ci
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

1. Run pending migrations (section 2).
2. Push a branch and open a pull request. Vercel builds a preview. Preview deployments should not point at the live database.
3. Merge to `main`. Vercel deploys production.
4. Check: home page, `/api/health`, admin sign-in, a test-mode booking if safe.

**Roll back:** Vercel > Deployments > previous deployment > **Promote to Production**. The migration above is compatible with the older code, so it does not need reversing.

## 8. Isolated test database

Tests refuse to run unless the database name contains `koko_test`. Set **every** variable in the shell, so nothing falls through to `.env`.

```bash
npx prisma migrate deploy
```

```bash
npx tsx prisma/seed.ts
```

```bash
RUN_DATABASE_TESTS=1 npm run test:integration
```

```bash
npm run build
```

```bash
RUN_DATABASE_TESTS=1 npx tsx tests/http-smoke.ts
```

```bash
RUN_DATABASE_TESTS=1 npx tsx tests/e2e-browser.ts
```
