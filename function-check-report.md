# Function and database check — 30 September 2026

Target: local website at http://127.0.0.1:3000 connected to the configured Supabase PostgreSQL database. These results do not verify the deployed Vercel environment.

## Passed
- Eleven routes responded successfully.
- Admin login, cookie attributes, unauthorized access rejection, origin protection and logout session revocation.
- Pay-at-delivery booking creation and direct database read-back; duplicate requests returned the existing booking.
- Server-controlled price calculation and stale-price rejection.
- Private order access and admin booking search.
- Order transitions through confirmed, preparing, ready and completed; payment status persisted. Invalid transition rejected.
- Contact form message persisted; honeypot rejected.
- Admin product creation, price/stock changes and inactive state persisted.
- Time-slot creation/capacity updates and FAQ creation/updates persisted.
- Admin changes generated audit records.
- Eight regression tests passed; TypeScript check passed.

## Fixed
Booking validation previously accepted only English and Malayalam. It now accepts Tamil and Hindi too. A Tamil booking passed the HTTP/database check, and a regression test covers all four languages.

## Limits / remaining setup
- Razorpay keys are missing locally. No real checkout, payment capture, refund or live webhook was tested. The signature helper's unit test passed only.
- Valid global website-settings updates were not submitted to avoid changing business details; invalid settings were rejected.
- Production Vercel configuration and scheduled payment reconciliation were not verified.
- This was a targeted API/database check, not an exhaustive browser, accessibility, load or security audit.

Only temporary test fixtures were created and removed. Existing customer records were not modified.

The two supabase smoke scripts are opt-in: they require RUN_DATABASE_TESTS=1, a running local app and the configured project database. They create temporary records and clean up their own fixtures. Do not run concurrently with each other.
