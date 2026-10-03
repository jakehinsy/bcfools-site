const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CONTROLLED_PATH = "/membership/registration/controlled";

/** The origin is supplied by the server's configured membership composition. */
export function safeControlledAuthorizationUrl(raw: unknown, requestToken: unknown, memberOrigin: unknown): string | null {
  if (typeof raw !== "string" || typeof requestToken !== "string" || !TOKEN_PATTERN.test(requestToken) ||
    typeof memberOrigin !== "string") return null;
  try {
    const origin = new URL(memberOrigin);
    const local = origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) && origin.port === "3002";
    if ((origin.protocol !== "https:" && !local) || memberOrigin !== origin.origin || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash) return null;
    const expected = `${origin.origin}${CONTROLLED_PATH}?request=${requestToken}`;
    // Exact serialization rejects encoded separators, credentials, fragments,
    // duplicate/nested queries and URL normalization tricks before navigation.
    return raw === expected ? expected : null;
  } catch { return null; }
}

export function controlledAuthorizationResponse(value: unknown, memberOrigin: string | null): { requestToken: string; authorizationUrl: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const controlled = (value as Record<string, unknown>).controlled;
  if (!controlled || typeof controlled !== "object" || Array.isArray(controlled)) return null;
  const { requestToken, authorizationUrl } = controlled as Record<string, unknown>;
  const safeUrl = safeControlledAuthorizationUrl(authorizationUrl, requestToken, memberOrigin);
  return safeUrl && typeof requestToken === "string" ? { requestToken, authorizationUrl: safeUrl } : null;
}

/** Codes are held in the fragment only until the same-origin return POST. */
export function controlledReturnFragment(fragment: string): { requestToken: string; returnCode: string } | null {
  if (!/^#(?:request=[A-Za-z0-9_-]{43}&return=[A-Za-z0-9_-]{43}|return=[A-Za-z0-9_-]{43}&request=[A-Za-z0-9_-]{43})$/.test(fragment)) return null;
  const fields = new URLSearchParams(fragment.slice(1));
  return { requestToken: fields.get("request")!, returnCode: fields.get("return")! };
}
