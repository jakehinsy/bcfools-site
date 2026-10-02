# Brew City paid-registration production website

This release starts from production website commit `de6a3ffc`. It selectively
ports the accepted paid application/status/branding/account journey, retaining
the production Turnstile widget, signed abuse evidence, opaque network
fingerprint, structured application validation, existing roster connection and
public event implementation.

## Server configuration

Use `production-registration.env.example` as a names-only configuration guide.
The website holds the existing membership program signing credential; it never
holds Stripe keys or a Supabase service-role key.

`BREW_MEMBERSHIP_PAID_PRODUCTION=true` selects the production-capable journey.
It **does not enable collection**. The configured tuple must resolve to:

- Site: `https://brewcityfools.com`
- Admin: `https://admin.platoonapp.com`
- Member web: `https://app.platoonapp.com`
- Supabase project: `baugcxlhxcyszqoetxfq`
- Organization: `65a6f189-213c-42ea-9f7f-6508c34d082d`
- Program: `75623f17-1280-432c-8798-3d3ff746e304`

The server-resolved policy must confirm the organization, program, environment,
fixed price and supported term. A missing or conflicting binding fails closed;
paid intake never falls back to the manual application endpoint.

Sandbox hosted acceptance uses `BREW_MEMBERSHIP_PAID_ACCEPTANCE=true`, explicit
distinct HTTPS origins, an explicitly allowed non-production project and the
controlled recipient list. It cannot target production or Pilot staging.
Local-only mode uses explicit loopback site/Admin origins and synthetic
`@example.test` recipients. Do not combine these modes.

## Operational controls

`GET /api/public/membership-registration-policy?handle=...` is read from the
configured Admin origin with `x-membership-program-key`. It returns these
presentation fields, all resolved server-side:

```text
paidRegistration.organizationId
paidRegistration.programId
paidRegistration.environment
paidRegistration.amountMinor = 7500
paidRegistration.currency = USD
paidRegistration.oneTime = true
paidRegistration.paidThrough
paidRegistration.policyRevision
paidRegistration.formVisible
paidRegistration.collectionMode = paused | controlled | public
paidRegistration.checkoutEnabled
paidRegistration.available
abuseProtection (the existing production Turnstile configuration)
```

The initial production state is `formVisible=true`, `collectionMode=paused`,
`checkoutEnabled=false`, `available=false`. `/join` renders the complete form,
disclosure and optional account sign-in, while its submit action remains
disabled. Existing registration/status/resume and paid account continuation
remain available. Setting `checkoutAvailable=false` in a registration status
suppresses only the new Checkout action, preserving status and paid setup.

The website independently requires intentional same-origin JSON POST for
registration, invitation activation, journey changes and continuation actions.
The Admin/database independently enforce all collection controls; browser
button state is not authorization.

Transport failures retain the exact pending signed payload and submission UUID
for server recovery. A definitive `403/BOT_CHECK_FAILED` for an unpersisted
request clears only that stale pending proof, preserves the form/draft and UUID,
and requires a fresh Turnstile challenge. It does not create another payment.

## Controlled invitation

A server-issued invitation may use the private website entry:

`/join/registration/invitation#invitation=<opaque credential>`

The fragment is removed from browser history on load. Opening the page does not
activate or consume the invitation. The applicant explicitly clicks the button,
then a same-origin POST validates the invitation against Admin's controlled
policy and stores an encrypted, HttpOnly, SameSite=Lax cookie for at most seven
days. The raw token is never stored in browser web storage or returned in API
responses. It is forwarded server-to-server as
`x-membership-controlled-invitation` for intake and Checkout continuation.

Only Admin's authoritative invitation/application binding can authorize the
controlled recipient. Knowing a URL, email or application ID is insufficient.
The cookie expiry does not extend Admin's invitation validity.

## Routes

Browser calls use `/api/membership-registrations`,
`/api/membership-registration-continuation`,
`/api/membership-registration-resume`,
`/api/membership-registration-journey`, and
`/api/membership-registration-account`. Accepted `/api/local/...` aliases are
retained for private fixture compatibility and enforce the same guards.

Admin intake remains `/api/public/membership-registrations` with the existing
canonical HMAC application signature path `/api/public/membership-applications`.
Admin journey uses `/api/public/membership-registration-journey`.

No payment, identity, membership or term authority is supplied by the browser.
Stripe return parameters only trigger a server status/reconciliation check.

## Validation

Install the unchanged lockfile with `npm ci`, then run:

```sh
npm run build
npm test
npx tsc --noEmit
```

The full suite includes real local Next-server browser-binding/fallback tests,
production/sandbox configuration isolation, form/Turnstile source guards,
registration presentation, controlled-cookie integrity/expiry, and same-origin
mutation checks. Payment and account authorization remain covered by the
Platoon backend/database suites and later sandbox hosted acceptance.
