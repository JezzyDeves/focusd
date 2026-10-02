// Smoke-tests a running server: the rooms API, host checks, and the security headers.
// Usage: node scripts/smoke-api.mjs [base-url]   (default http://localhost:3000)
const base = process.argv[2] ?? "http://localhost:3000";
let failed = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
}

const json = (method, body) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const page = await fetch(base);
const csp = page.headers.get("content-security-policy") ?? "";
check("page is served", page.ok, String(page.status));
check("CSP uses a nonce and strict-dynamic", /'nonce-[^']+' 'strict-dynamic'/.test(csp));
check("CSP blocks framing", csp.includes("frame-ancestors 'none'"));
check("X-Frame-Options is DENY", page.headers.get("x-frame-options") === "DENY");
check("Referrer-Policy is same-origin", page.headers.get("referrer-policy") === "same-origin");
check("X-Content-Type-Options is nosniff", page.headers.get("x-content-type-options") === "nosniff");
check("X-Powered-By is hidden", !page.headers.has("x-powered-by"));

const created = await fetch(`${base}/api/rooms`, { method: "POST" });
check("create room", created.status === 201, String(created.status));
const { id, hostToken } = await created.json();

const got = await fetch(`${base}/api/rooms/${id}`);
const info = await got.json();
check("get room", got.ok && info.id === id && info.session === null);
check("malformed id is 404", (await fetch(`${base}/api/rooms/NOT-AN-ID`)).status === 404);
check("unknown id is 404", (await fetch(`${base}/api/rooms/zzzzzzzzzzzz`)).status === 404);

const start = (token, minutes) => fetch(`${base}/api/rooms/${id}/session`, json("POST", { hostToken: token, mode: "focus", minutes, checkins: false }));
check("start with a wrong token is 403", (await start("wrong", 25)).status === 403);
const started = await start(hostToken, 999);
const s = (await started.json()).session;
check("host can start, minutes clamped", started.ok && s.endAt - s.startAt === 99 * 60_000);

const big = await fetch(`${base}/api/rooms/${id}/session`, { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(5000) });
check("oversized body is refused", big.status === 400, String(big.status));

check("close with a wrong token is 403", (await fetch(`${base}/api/rooms/${id}`, json("DELETE", { hostToken: "wrong" }))).status === 403);
check("host can close", (await fetch(`${base}/api/rooms/${id}`, json("DELETE", { hostToken }))).status === 204);
check("closed room is 404", (await fetch(`${base}/api/rooms/${id}`)).status === 404);

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("all checks passed");
