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

The `/join` route contains the native membership-form preview for new members
and annual renewals. Its same-origin server route can submit signed applications
to Platoon's tenant-safe staging intake while keeping the program credential out
of the browser. Square remains a separate later step. The existing Jotform stays
linked as the live fallback during staging validation.

The staging payload includes a separate, optional SMS-consent choice and a
server-validated disclosure version. The control is intentionally unchecked by
default. Public `/privacy` and `/terms` pages describe the application data,
Platoon account handoff, optional messaging program, and payment boundary.

Existing Platoon users can connect through a server-mediated PKCE flow. The
website carries the short-lived verifier in authenticated encrypted state and
binds the callback to a nonce held only in the initiating browser session. The
single-use connection receipt is stored only in an encrypted, `HttpOnly`
cookie. The browser form receives the verified email and approved profile
prefill, but never receives the verifier, receipt, or program secret.
Applicants who do not connect an account receive Platoon's secure activation
or sign-in email after intake; no password is collected by the public website.

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
- `PLATOON_MEMBERSHIP_INTAKE_BYPASS_SECRET` — an optional server-only Vercel
  Preview bypass secret when the Platoon staging deployment is protected

Do not expose these values through `NEXT_PUBLIC_*` variables.

The `/events` route contains a responsive public calendar and upcoming-event
list. Event rendering is driven by the typed shape in `src/data/events.ts`;
the source remains intentionally empty until an approved public Platoon event
feed is available.

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
destinations live in `src/config/site.ts`. The current Jotform, contact, social,
and legacy dues destinations remain available until the replacement workflow
is validated end to end.
