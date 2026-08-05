import {
  publicEventFlyerRequestInit,
  publicEventFlyerRequestUrl,
  type PublicEventFlyerRendition,
} from "@/lib/publicOrganizationEvents";

export const dynamic = "force-dynamic";

const renditionContentTypes: Record<PublicEventFlyerRendition, readonly string[]> = {
  thumbnail: ["image/webp"],
  detail: ["image/webp"],
  full: ["image/webp"],
  original: ["application/pdf", "image/jpeg", "image/png"],
};

function isRendition(value: string): value is PublicEventFlyerRendition {
  return Object.hasOwn(renditionContentTypes, value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ flyerId: string; rendition: string }> },
) {
  const { flyerId, rendition } = await params;
  if (!isRendition(rendition)) return new Response(null, { status: 404 });

  const endpoint = process.env.PLATOON_PUBLIC_EVENTS_URL?.trim() ?? "";
  const upstreamUrl = publicEventFlyerRequestUrl(endpoint, flyerId, rendition);
  if (!upstreamUrl) return new Response(null, { status: 404 });

  const bypassSecret = process.env.PLATOON_PUBLIC_EVENTS_BYPASS_SECRET?.trim();
  try {
    const upstream = await fetch(
      upstreamUrl,
      publicEventFlyerRequestInit(rendition, bypassSecret),
    );
    if (!upstream.ok || !upstream.body) {
      return new Response(null, { status: upstream.status === 404 ? 404 : 502 });
    }

    const contentType = upstream.headers.get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (!contentType || !renditionContentTypes[rendition].includes(contentType)) {
      return new Response(null, { status: 502 });
    }

    const headers = new Headers({
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, { headers, status: 200 });
  } catch {
    return new Response(null, { status: 502 });
  }
}
