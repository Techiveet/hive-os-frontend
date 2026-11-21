import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_WIDTHS = new Set([64, 96, 128, 192, 256, 384]);

function getInternalApiRoot(): string {
  const configured =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8081/api/v1";

  const normalized = configured.replace(/\/+$/, "");
  return /\/api\/v1$/i.test(normalized) ? normalized : `${normalized}/api/v1`;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid image id" }, { status: 400 });
  }

  const rawWidth = Number(request.nextUrl.searchParams.get("w") ?? "192");
  const width = ALLOWED_WIDTHS.has(rawWidth) ? rawWidth : 192;

  const tenant = request.nextUrl.searchParams.get("tenant")?.trim() ?? "";
  if (tenant && !/^[a-z0-9-]+$/i.test(tenant)) {
    return NextResponse.json({ error: "Invalid tenant parameter" }, { status: 400 });
  }

  const upstreamUrl = `${getInternalApiRoot()}/files/${id}/public-serve${
    tenant ? `?tenant=${encodeURIComponent(tenant)}` : ""
  }`;

  const upstreamHeaders: Record<string, string> = {
    Accept: "image/*,*/*;q=0.8",
  };
  if (tenant) {
    upstreamHeaders["X-Tenant"] = tenant;
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: upstreamHeaders,
      cache: "force-cache",
      next: { revalidate: 3600 },
    });
  } catch {
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status });
  }

  const contentType = (upstream.headers.get("content-type") || "application/octet-stream").toLowerCase();
  const inputBuffer = Buffer.from(await upstream.arrayBuffer());

  const cacheHeaders = {
    "Cache-Control": "public, max-age=2592000, stale-while-revalidate=31536000",
    Vary: "Accept",
  };

  // Pass SVG, GIF, ICO, or non-image assets through untouched.
  if (
    !contentType.startsWith("image/") ||
    contentType.includes("svg") ||
    contentType.includes("gif") ||
    contentType.includes("icon")
  ) {
    return new NextResponse(inputBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...cacheHeaders,
      },
    });
  }

  const accept = request.headers.get("accept") || "";
  const preferWebp = accept.includes("image/webp");

  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    let pipeline = sharp(inputBuffer).resize({
      width,
      withoutEnlargement: true,
      fit: "inside",
    });

    if (preferWebp) {
      pipeline = pipeline.webp({ quality: 72, effort: 6 });
    } else {
      pipeline = pipeline.png({ compressionLevel: 9, palette: true });
    }

    const output = await pipeline.toBuffer();
    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": preferWebp ? "image/webp" : "image/png",
        ...cacheHeaders,
      },
    });
  } catch {
    // Graceful pass-through if sharp fails on an unusual image encoding.
    return new NextResponse(inputBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...cacheHeaders,
      },
    });
  }
}
