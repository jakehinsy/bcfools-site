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
and annual renewals. It intentionally does not persist or transmit entries
until Platoon's tenant-safe intake endpoint and Square hosted checkout are
available. The existing Jotform remains linked as the live fallback during
that integration period.

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
