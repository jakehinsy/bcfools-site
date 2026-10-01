# Local paid membership registration

This flow is available only when `BREW_MEMBERSHIP_PAID_LOCAL=true`, `NODE_ENV` is not `production`, and both the Brew City website and Platoon intake use loopback HTTP origins. Production and ordinary local runs keep the existing chapter review application.

Use the existing `PLATOON_MEMBERSHIP_PROGRAM_KEY`, `PLATOON_MEMBERSHIP_PROGRAM_SECRET`, and `PLATOON_MEMBERSHIP_INTAKE_URL` settings. The intake URL remains the canonical `/api/public/membership-applications` path on the local Platoon origin; the website uses that path for the signature while sending paid registrations to `/api/public/membership-registrations`. Do not place secret values in this document.

The website reads `/api/local/membership-registration-policy` from Platoon and displays its paid-through date. A registration is stored in browser local storage with its UUID and original payload before the request. The same UUID and payload are replayed after an uncertain response. Once a continuation is received, the website stores it in a sealed HTTP-only cookie and uses `/join/registration` for status, checkout, and payment verification. The emailed `#registration=...&continuation=...` fragment can resume the same registration. Checkout return query parameters only prompt a server status check.

Start the website in development mode on a loopback origin such as `http://127.0.0.1:3025`, with the local Platoon origin at `http://127.0.0.1:3001`. Use `next dev --webpack` if dependencies are symlinked from another checkout; Turbopack requires dependencies inside its project root.

Only synthetic addresses ending in `@example.test` are accepted by the local paid proxy. The local POST routes require same-origin JSON requests. Registration resume checks the continuation with Platoon before replacing the cookie.

Configure the isolated website with `node scripts/local-payments/configure-website.mjs <website-checkout>` from the Platoon repository. The public program handle is not required in the local paid branch. Private pages and responses disable caching and referrer sharing. The sealed cookie contains continuation authority; do not export it or browser storage as public acceptance evidence.
