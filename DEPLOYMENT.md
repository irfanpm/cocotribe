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

## 9. WhatsApp order alerts to the owner

The owner's WhatsApp receives an alert when:

- a Cash on Delivery booking is placed;
- an online booking is paid; or
- staff change an order to **Confirmed**.

Online bookings alert only once they are paid, not while the customer is still at checkout. A retried request or a repeated Razorpay webhook never sends a second alert. Alerts are sent after the customer's response, so a WhatsApp problem never blocks a booking. Failures are logged.

Alerts use Meta's official **WhatsApp Cloud API**. Messages a business starts must use a template Meta has approved, and Meta charges per delivered message (see Meta's rate card for India).

1. In [Meta for Developers](https://developers.facebook.com/), create an app with the **Connect with customers through WhatsApp** use case and a business portfolio.
2. Choose the number that **sends** the alerts. This must be a business number on the Cloud API, not the owner's own phone. Meta's test number works for trying it out. For permanent use, add a business phone number.
3. In WhatsApp Manager, create a template:
   - **Name:** `booking_alert`
   - **Category:** Utility
   - **Language:** English (`en`)
   - **Body:** exactly this text, with seven variables in this order:

   ```text
   COCOTRIBE alert: {{1}}. Booking {{2}}. Customer {{3}}. Order {{4}}. Visit {{5}}. Payment {{6}}. Total {{7}}.
   ```

   Example values for Meta's review: `New booking`, `KT-1A2B3C4D5E`, `Asha (+919000090000)`, `2 x Pooja Coconut · Mini Pack (2 pcs)`, `2026-11-20, 06:00 – 09:00 IST`, `Cash on Delivery, pending`, `Rs 100`.
4. Create a **system user** in Business Settings and generate a **permanent** access token with WhatsApp messaging permission. Temporary tokens expire quickly.
5. Set these in Vercel (Production), then redeploy:

   | Variable | Value |
   |---|---|
   | `WHATSAPP_TOKEN` | The permanent token. Secret. |
   | `WHATSAPP_PHONE_NUMBER_ID` | The sending number's Phone Number ID from API Setup. |
   | `OWNER_WHATSAPP` | `918111935267` (country code and number, no `+`). |
   | `WHATSAPP_TEMPLATE` | Optional. Defaults to `booking_alert`. |
   | `WHATSAPP_TEMPLATE_LANG` | Optional. Defaults to `en`. Must match the template's language. |

6. With Meta's test number, add `+91 81119 35267` as an allowed recipient in API Setup.
7. In **Admin > Website settings > WhatsApp order alerts**, press **Send test alert**. If WhatsApp refuses it, Meta's reason is shown there, for example a wrong template name or an expired token.

Customer names, phone numbers and orders pass through Meta to deliver these alerts. Mention this in the privacy policy if required.

## 10. New-order notifications on admin phones (free)

The admin panel can be installed as an app. Any phone or computer that turns notifications on is notified when:

- a Cash on Delivery booking is placed;
- an online booking is paid; or
- staff confirm an order.

Tapping a notification opens that order. Notifications use the browser's own push service, cost nothing, and are encrypted so only the device can read them. They are sent after the customer's response, so a notification problem never affects a booking.

**One-time server setup**

1. Run this on your computer once:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. In Vercel (Production), set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to the two printed values. The private key is a secret. Optionally set `VAPID_SUBJECT` to `mailto:your-email` or your site's `https://` address. Then redeploy.

   Do not change these keys later: every device would have to turn notifications on again.

3. Apply the database migration `202611100001_admin_push_subscriptions` (section 2) before deploying. It only adds one table.

**On each admin phone**

- **Android (Chrome):** open `https://YOUR-DOMAIN/admin`, sign in, then tap **Turn on notifications** and allow them. Use Chrome's menu, then **Add to Home screen** or **Install app**, for an app icon.
- **iPhone (iOS 16.4 or later):** open the admin in Safari, tap **Share**, then **Add to Home Screen**. Open **COCOTRIBE Admin** from the Home Screen, sign in, and turn notifications on there. Safari tabs cannot receive notifications.
- In **Admin > Website settings > New-order notifications**, press **Send test notification** to check it arrives.

**Limits**

- Some Android phones delay notifications in battery-saving mode. Allow the browser to run in the background.
- If a phone is off for more than 12 hours, that notification may be dropped.
- Keep checking the admin panel regularly; notifications support it but do not replace it.
- Notifications on a locked screen show the customer's name and order. Turn off lock-screen previews on the phone if needed.

WhatsApp alerts (section 9) remain available and stay off unless their settings are added.
