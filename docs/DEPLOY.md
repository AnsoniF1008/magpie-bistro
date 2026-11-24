# Deployment

The site is live on **Firebase App Hosting** (project `themagpiebistro`). The first part of this
document describes that setup. The second part keeps the alternative Vercel + Neon route.

## Firebase (current production)

| Piece | Where it lives |
| --- | --- |
| Web app (site, admin, API) | App Hosting backend `magpie`, region `us-east4` — https://magpie--themagpiebistro.us-east4.hosted.app |
| Database | Cloud SQL for PostgreSQL 16, instance `magpie-db` (`db-f1-micro`), database `magpie`, user `magpie`, daily backups |
| Photos | Cloud Storage bucket `themagpiebistro-media` (private; served through the site) |
| Secrets | Secret Manager: `magpie-payload-secret`, `magpie-db-password` |
| Settings | `apphosting.yaml` (environment), `firebase.json` (what gets uploaded) |

### Deploy a new version
```bash
npm run lint && npm test          # optional but recommended
firebase deploy --only apphosting
```
The build runs in Google Cloud and takes a few minutes. Pending database migrations run on their own when the new version starts.

### Change the database schema
Local SQLite keeps syncing automatically. Production does not, so after changing a collection or global:
```bash
# needs any Postgres database to connect to; GCS_BUCKET must be set (any value) so the
# photo-storage column stays in the schema
GCS_BUCKET=x DATABASE_URL=postgres://user:pass@localhost/scratch npm run payload migrate:create describe_the_change
```
Commit the new files in `src/migrations` and deploy.

### Add Stripe, Resend and the other keys
```bash
firebase apphosting:secrets:set stripe-secret-key      # paste the value when asked; answer yes to granting access
```
Then uncomment the matching lines in `apphosting.yaml` and deploy. Stripe's webhook endpoint is
`https://<domain>/api/stripe/webhook` (events listed in the Stripe section below).

### Custom domain
Firebase console → App Hosting → `magpie` → Settings → Add custom domain, then change
`NEXT_PUBLIC_SITE_URL` in `apphosting.yaml` and deploy.

### Costs to expect
Cloud SQL is billed monthly whether or not anyone visits (the smallest instance). App Hosting scales to zero
(`minInstances: 0`), so the first visit after a quiet period takes a few seconds; set `minInstances: 1` to remove
that delay at a higher monthly cost. Set a budget alert in Google Cloud Billing.

---

# Alternative: deploying to Vercel

Do these in order. Each step is independent enough to stop and test.

## 1. Repository
Push this folder to a GitHub repository owned by the client. CI (`.github/workflows/ci.yml`) runs typecheck, unit tests and end-to-end tests on every pull request.

## 2. Database — Neon
1. Create a Neon project (region close to Virginia, e.g. `us-east-1`).
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. Create the schema and the first data from your machine:
   ```bash
   # with DATABASE_URL and PAYLOAD_SECRET set in .env
   npm run payload migrate:create initial   # writes src/migrations — commit it
   npm run payload migrate
   npm run seed
   ```
   From then on, every schema change needs `migrate:create` locally and `migrate` against production. Local SQLite keeps syncing automatically.
4. Turn on Neon's point-in-time restore (daily backups, 30 days on paid plans) and do one test restore to a branch.

## 3. Vercel project
1. Import the repository. Framework: Next.js. Node 22.
2. Storage → create a **Blob** store and connect it (sets `BLOB_READ_WRITE_TOKEN`). Without it uploaded photos disappear on the next deploy.
3. Environment variables — everything in `.env.example` that applies. `PAYLOAD_SECRET` and `NEXT_PUBLIC_SITE_URL` are mandatory.
4. Deploy, open `/admin`, sign in with the seeded owner and change the password.
5. Re-upload or check the photos (the seed uploads them to whatever storage is active when it runs).

## 4. Stripe
1. Use test keys first: `STRIPE_SECRET_KEY=sk_test_…`.
2. Developers → Webhooks → add endpoint `https://<domain>/api/stripe/webhook` with events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`.
   Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Place a test order with card `4242 4242 4242 4242`: it should appear in "To prepare" within seconds and both emails should arrive. Refund it from the order's Details window.
4. Approve a test special request and pay it from the emailed link.
5. Switch to live keys and a live webhook endpoint, then repeat one real low-value order.

Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## 5. Email — Resend
Verify the sending domain, then set `RESEND_API_KEY` and `EMAIL_FROM`. Check Site settings → "Send new-order emails to".

## 6. Rate limiting — Upstash
Create a Redis database and set the two `UPSTASH_REDIS_REST_*` variables. Without them each serverless instance counts on its own, which is weak protection.

## 7. Domain, search and analytics
1. Add the domain in Vercel and update `NEXT_PUBLIC_SITE_URL`. HTTPS and HSTS are automatic.
2. Search Console: add the property, put the verification code in `NEXT_PUBLIC_GSC_VERIFICATION`, submit `/sitemap.xml`.
3. Validate the home page and `/menu` at https://validator.schema.org.
4. GA4: set `NEXT_PUBLIC_GA_ID`. The consent banner appears only once this is set.
5. Add the website link to the Google Business Profile.
6. Sentry (optional): set both DSN variables.

## 8. Before announcing it
- Confirm the sales tax rate with the accountant (Site settings → Orders & tax). The starting value is 5.3%; a local meals tax may also apply, and special orders are charged the amount the owner enters, with no tax added automatically.
- Have the business review Privacy, Terms and Allergy pages.
- Run Lighthouse (mobile) on `/` and `/menu` on the production URL.
- Replace the stand-in photos with the bistro's own.
