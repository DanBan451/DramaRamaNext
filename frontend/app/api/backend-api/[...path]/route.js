function getBackendBaseUrl() {
  // Prefer a server-only env var so you can point Vercel at an http:// EC2 URL
  // without exposing it to the browser (and without mixed-content issues).
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");
}

function filterRequestHeaders(headers) {
  const h = new Headers(headers);
  // Hop-by-hop headers (don’t forward)
  h.delete("connection");
  h.delete("host");
  h.delete("content-length");
  return h;
}

function filterResponseHeaders(headers) {
  const h = new Headers(headers);
  // Hop-by-hop headers (don’t return)
  h.delete("connection");
  h.delete("content-encoding");
  h.delete("content-length");
  return h;
}

async function proxy(req, { path }) {
  const base = getBackendBaseUrl();
  const url = new URL(req.url);
  const upstream = `${base}/api/${(path || []).join("/")}${url.search}`;

  const init = {
    method: req.method,
    headers: filterRequestHeaders(req.headers),
    // Don’t cache auth’d requests
    cache: "no-store",
  };

  // Only include body when it makes sense
  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(upstream, init);

  return new Response(res.body, {
    status: res.status,
    headers: filterResponseHeaders(res.headers),
  });
}

export async function GET(req, ctx) {
  return proxy(req, ctx.params);
}
export async function POST(req, ctx) {
  return proxy(req, ctx.params);
}
export async function PUT(req, ctx) {
  return proxy(req, ctx.params);
}
export async function PATCH(req, ctx) {
  return proxy(req, ctx.params);
}
export async function DELETE(req, ctx) {
  return proxy(req, ctx.params);
}


