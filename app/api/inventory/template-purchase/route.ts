import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL;

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  const backendRes = await fetch(
    `${BACKEND_URL}/logistics/inventory/template/purchase-import`,
    {
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
      },
    },
  );

  if (!backendRes.ok) {
    return NextResponse.json(
      { error: "Download failed" },
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
      "Content-Disposition": disposition,
      "Access-Control-Expose-Headers": "Content-Disposition",
    },
  });
}
