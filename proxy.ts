import { NextRequest, NextResponse } from "next/server";

const mobileUserAgentPattern =
  /Android|iPhone|iPad|iPod|Mobile|Windows Phone|BlackBerry|Opera Mini/i;

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const uaMobile = request.headers.get("sec-ch-ua-mobile") === "?1";

  if (uaMobile || mobileUserAgentPattern.test(userAgent)) {
    return NextResponse.redirect(new URL("/mobile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
