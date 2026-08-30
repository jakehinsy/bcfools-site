# Brew City F.O.O.L.S.

Public website for the Brew City chapter of F.O.O.L.S. International, serving
Milwaukee and southeastern Wisconsin.

## Project direction

- Static-first Next.js App Router site deployed through Vercel
- Public chapter, training, event, membership, leadership, and contact content
- Organization details and external destinations kept in typed local
  configuration
- No private Platoon member data or authenticated content

The first design pass establishes the homepage, responsive navigation, chapter
brand system, training imagery, membership flow, social metadata, and useful
empty state for events.

The `/join` route contains the native application for new members and links
renewing members to Platoon's authenticated Account > Membership flow. Its
same-origin server route submits signed applications to Platoon's tenant-safe
intake while keeping the program credential out of the browser. The public form
does not collect payment. Approved applicants receive secure web-account
instructions by email and pay dues from Platoon after approval. The existing
WordPress/Jotform/WooCommerce flow remains unchanged on the live domain, but the
replacement-site preview does not link applicants or renewing members back to it.

The staging payload includes a separate, optional SMS-consent choice and a
server-validated disclosure version. The control is intentionally unchecked by
default. Public `/privacy` and `/terms` pages describe the application data,
Platoon account handoff, optional messaging program, and payment boundary.

Existing Platoon users can connect through a server-mediated PKCE flow. The
website carries the short-lived verifier in authenticated encrypted state and
binds the callback to a nonce held only in the initiating browser session. The
single-use connection receipt is stored only in an encrypted, `HttpOnly`
cookie. The browser form receives the verified email and approved profile
prefill. That prefill is limited to canonical full name plus the phone,
department name/state, rank, and active/retired fire-service status attached to
a current approved department relationship. Unknown or unavailable values stay
empty, and all prefilled application fields remain editable. The browser never
receives the verifier, receipt, program secret, or internal Platoon identifiers.
After chapter approval, applicants receive Platoon's secure activation or
sign-in email; no password is collected by the public website.

The server route requires these Vercel Preview environment variables:

- `PLATOON_MEMBERSHIP_INTAKE_URL` — the full HTTPS Platoon intake endpoint
- `PLATOON_MEMBERSHIP_PROGRAM_KEY` — the public program key ID
- `PLATOON_MEMBERSHIP_PROGRAM_SECRET` — the server-only HMAC secret
- `PLATOON_MEMBERSHIP_PROGRAM_HANDLE` — the public `mpp_...` program handle
- `PLATOON_MEMBERSHIP_CONNECTION_AUTHORIZE_URL` — the full HTTPS Platoon
  `/membership-connect/authorize` endpoint
- `PLATOON_MEMBERSHIP_CONNECTION_EXCHANGE_URL` — the full HTTPS Platoon
  `/api/public/membership-connections/exchange` endpoint
- `PLATOON_MEMBERSHIP_RETURN_URL` — the exact allowlisted HTTPS callback URL,
  ending in `/api/platoon/connect/callback`
- `PLATOON_MEMBER_WEB_ORIGIN` — optional member-web origin override used to
  construct the Account > Membership management link
- `PLATOON_MEMBERSHIP_INTAKE_BYPASS_SECRET` — an optional server-only Vercel
  Preview bypass secret when the Platoon staging deployment is protected

Do not expose these values through `NEXT_PUBLIC_*` variables.

For isolated local certification, the membership endpoints, callback URL, and
member-web origin may use plain HTTP only when they target `localhost`,
`127.0.0.1`, or `[::1]` and the site is running in development mode. Production
builds continue to require HTTPS. Point the intake, authorize, and exchange
variables at the local Platoon Admin adapter; set the return URL to this site's
local callback and `PLATOON_MEMBER_WEB_ORIGIN` to the local member-web origin.

The `/events` route contains a responsive public calendar and upcoming-event
list backed by Platoon's tenant-safe public organization-events feed. The
server validates and reduces the upstream payload before it reaches the client,
and only explicitly public organization events appear. Stable category keys,
names, and colors drive both the list filters and calendar legend; tenant-level
label or color overrides remain in `src/config/site.ts`.

The public-events adapter uses these server-only Preview variables:

- `PLATOON_PUBLIC_EVENTS_URL` — the full HTTPS Platoon
  `/api/public/organization-events` endpoint
- `PLATOON_PUBLIC_EVENTS_BYPASS_SECRET` — optional Vercel Preview deployment
  protection bypass value for the Platoon staging endpoint

The website requests a bounded 12-month window and caches the public response
for five minutes. Feed failures render a safe retry state and never fall back to
private or locally duplicated event data.

The `/contact` route merges the legacy Contact and E-Board pages into a single
leadership and role-directory experience. Officer names, portraits, and public
role addresses are configuration-driven, and the legacy `/e-board` path
redirects permanently to the merged page.

The `/about` route combines Brew City's chapter history, purpose, and selected
fire-service traditions into one concise public story. The legacy
`/who-we-are` and `/f-o-o-l-s-acronyms` paths redirect permanently to it, while
the structured chapter pillars and acronyms live in `src/data/about.ts`.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run build
```

## Content and links

Organization-specific labels, fees, review roles, navigation, and external
destinations live in `src/config/site.ts`. The replacement-site preview uses the
native application and Platoon Account > Membership destinations while the live
WordPress site remains unchanged until separately authorized.
