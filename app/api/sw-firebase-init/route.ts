import { NextResponse } from "next/server";

/**
 * Serves Firebase config as executable JavaScript for the Service Worker.
 * The SW uses importScripts('/api/sw-firebase-init') to load this at runtime,
 * keeping env vars out of the static public/ file.
 */
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const js = `firebase.initializeApp(${JSON.stringify(config)});`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-store",
    },
  });
}
