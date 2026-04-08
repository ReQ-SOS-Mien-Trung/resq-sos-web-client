import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL;

/**
 * Server-side proxy for GET /logistics/inventory/export/movements
 *
 * Reason: Browsers block JS from reading the `Content-Disposition` header
 * from cross-origin responses unless the server sets
 * `Access-Control-Expose-Headers: Content-Disposition`.
 * By proxying through Next.js server, we avoid CORS entirely (server-to-server),
 * then forward the header back to the client over same-origin.
 */
export async function GET(request: NextRequest) {
  // Forward query params to backend
  const searchParams = request.nextUrl.searchParams;
  const url = new URL(`${BACKEND_URL}/logistics/inventory/export/movements`);
  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Forward Authorization header from client
  const authorization = request.headers.get("authorization");

  const backendRes = await fetch(url.toString(), {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  });

  if (!backendRes.ok) {
    return NextResponse.json(
      { error: "Export failed" },
      { status: backendRes.status },
    );
  }

  const arrayBuffer = await backendRes.arrayBuffer();
  const disposition = backendRes.headers.get("content-disposition") ?? "";
  const contentType =
    backendRes.headers.get("content-type") ??
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Expose to browser JS
      "Content-Disposition": disposition,
      "Access-Control-Expose-Headers": "Content-Disposition",
    },
  });
}
