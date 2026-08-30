import { NextResponse } from "next/server";
import { CONNECTION_COOKIE } from "@/lib/platoonMembership";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/join#application", request.url));
  response.cookies.delete(CONNECTION_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
