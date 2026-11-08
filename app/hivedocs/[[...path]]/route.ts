import type { NextRequest } from "next/server";

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "");

const getBackendOrigin = (): string => {
  const configured =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8081/api/v1";

  try {
    return new URL(configured).origin;
  } catch {
    return trimTrailingSlashes(configured).replace(/\/api\/v1$/i, "");
  }
};

const SAFE_HOST_PATTERN = /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/;

const getPublicOrigin = (request: NextRequest): string => {
  const rawHost = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host
  )
    .split(",")[0]
    .trim();
  const rawProtocol = (
    request.headers.get("x-forwarded-proto") ||
    request.nextUrl.protocol.replace(":", "")
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  const protocol = rawProtocol === "https" ? "https" : "http";
  const host = SAFE_HOST_PATTERN.test(rawHost) ? rawHost : request.nextUrl.host;

  return `${protocol}://${host}`;
};

const proxyDocs = async (
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) => {
  const { path = [] } = await context.params;
  if (path.some((segment) => segment === ".." || segment === "." || segment.includes("\\") || segment.includes("/"))) {
    return new Response("Invalid documentation path.", { status: 400 });
  }

  const backendOrigin = getBackendOrigin();
  const docsPath = path.length ? `/hivedocs/${path.map(encodeURIComponent).join("/")}` : "/hivedocs/";
  const targetUrl = new URL(docsPath, backendOrigin);
  if (
    targetUrl.origin !== new URL(backendOrigin).origin ||
    (targetUrl.pathname !== "/hivedocs" && !targetUrl.pathname.startsWith("/hivedocs/"))
  ) {
    return new Response("Invalid documentation path.", { status: 400 });
  }
  targetUrl.search = request.nextUrl.search;

  const upstream = await fetch(targetUrl, {
    headers: {
      accept: request.headers.get("accept") ?? "*/*",
      cookie: request.headers.get("cookie") ?? "",
      "user-agent": request.headers.get("user-agent") ?? "Hive frontend docs proxy",
    },
    redirect: "manual",
    cache: "no-store",
  });

  const headers = new Headers(upstream.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");

  const publicDocsBase = `${getPublicOrigin(request)}/hivedocs`;
  const location = headers.get("location");
  if (location) {
    headers.set(
      "location",
      location
        .replace(`${backendOrigin}/hivedocs`, publicDocsBase)
        .replace("http://localhost:8081/hivedocs", publicDocsBase),
    );
  }

  const contentType = headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    const html = (await upstream.text())
      .replaceAll(`${backendOrigin}/hivedocs`, publicDocsBase)
      .replaceAll("http://localhost:8081/hivedocs", publicDocsBase);

    return new Response(html, {
      status: upstream.status,
      headers,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
};

export const dynamic = "force-dynamic";
export const GET = proxyDocs;
export const HEAD = proxyDocs;
