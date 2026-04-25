import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/cloudinary/delete
 *
 * Delete one or more resources from Cloudinary using the Admin API.
 * This runs server-side so the `api_secret` is never exposed to the client.
 *
 * Body: { publicIds: string[] }
 * – publicIds are extracted from the secure_url returned at upload time.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const API_KEY = process.env.CLOUDINARY_API_KEY ?? "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "";

export async function POST(request: NextRequest) {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return NextResponse.json(
        { error: "Cloudinary credentials are not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const publicIds: string[] = body?.publicIds;

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return NextResponse.json(
        { error: "publicIds must be a non-empty array" },
        { status: 400 },
      );
    }

    // Cloudinary Admin API – Delete Resources (raw type for PDFs)
    // https://cloudinary.com/documentation/admin_api#delete_resources
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/raw/upload`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ public_ids: publicIds }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("[Cloudinary Delete] Error:", data);
      return NextResponse.json(
        { error: "Failed to delete from Cloudinary", details: data },
        { status: res.status },
      );
    }

    return NextResponse.json({ ok: true, deleted: data.deleted ?? {} });
  } catch (err) {
    console.error("[Cloudinary Delete] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
