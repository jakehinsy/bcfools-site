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

The server route requires these Vercel Preview environment variables:

- `PLATOON_MEMBERSHIP_INTAKE_URL` — the full HTTPS Platoon intake endpoint
- `PLATOON_MEMBERSHIP_PROGRAM_KEY` — the public program key ID
- `PLATOON_MEMBERSHIP_PROGRAM_SECRET` — the server-only HMAC secret

Do not expose these values through `NEXT_PUBLIC_*` variables.

The `/events` route contains a responsive public calendar and upcoming-event
list. Event rendering is driven by the typed shape in `src/data/events.ts`;
the source remains intentionally empty until an approved public Platoon event
feed is available.

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
