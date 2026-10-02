import { NextResponse, type NextRequest } from "next/server";

const isDev = process.env.NODE_ENV === "development";

/** The Supabase project's Realtime socket, the only place the browser connects besides this site. */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const realtime = supabase ? ` ${supabase} ${supabase.replace(/^http/i, "ws")}` : "";

/**
 * A strict Content-Security-Policy with a fresh nonce per request. Next.js adds the nonce to its own scripts,
 * and 'strict-dynamic' lets those load the rest of the app, so no injected or third-party script can run.
 */
function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Next's dev tools inject inline styles; a nonce would switch 'unsafe-inline' off, so dev uses it instead.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${realtime}${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Pages only: the API returns JSON, and static assets don't need a policy.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
