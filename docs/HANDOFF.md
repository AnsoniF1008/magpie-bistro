# Credentials handoff

Fill this in at handoff and store it in a password manager — **never commit real secrets to the repository.**
Every account should be owned by the business (its email, its card), with the developer added as a member.

| Service | What it is for | Account owner (email) | Where the secret lives | 2-factor on? |
| --- | --- | --- | --- | --- |
| Domain registrar | The web address | | | |
| GitHub | Source code | | | |
| Firebase / Google Cloud (project `themagpiebistro`) | Hosting (App Hosting), database (Cloud SQL), photo storage (Cloud Storage), billing | | | |
| Stripe | Card payments and refunds | | | |
| Resend | Order and request emails | | | |
| Upstash | Rate limiting | | | |
| Google Analytics / Search Console / Business Profile | Visits and search | | | |
| Sentry | Error alerts | | | |
| Website admin (`/admin`) | Owner login | | | |

## Environment variables in production
List which are set (names only, never values): 

- [ ] `PAYLOAD_SECRET`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `DATABASE_URL`
- [ ] `BLOB_READ_WRITE_TOKEN`
- [ ] `STRIPE_SECRET_KEY` (live)
- [ ] `STRIPE_WEBHOOK_SECRET` (live endpoint)
- [ ] `RESEND_API_KEY`, `EMAIL_FROM`
- [ ] `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GSC_VERIFICATION`
- [ ] `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`

## Checks done at handoff
- [ ] Test restore of a database backup, date: 
- [ ] Live test order placed and refunded, date: 
- [ ] Owner changed the seeded admin password
- [ ] Tax rate confirmed with the accountant
- [ ] Privacy / Terms / Allergy text approved by the business
- [ ] Post-launch support window ends: 
