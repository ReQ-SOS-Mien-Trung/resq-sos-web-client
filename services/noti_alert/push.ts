"use client";

import { ROLES } from "@/lib/roles";
import { unregisterFcmToken } from "./api";

const FCM_STORAGE_KEY = "resq:fcm-registration";
const NOTIFICATION_SERVICE_WORKER_PATH = "/firebase-messaging-sw.js";
const FIREBASE_WEB_PUSH_APP_NAME = "resq-web-push";
let hasWarnedMissingFirebaseConfig = false;

interface StoredFcmRegistration {
  token: string;
  userId: string | null;
}

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined";
}

function getFirebaseEnvConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  const hasConfig = Boolean(
    apiKey &&
    authDomain &&
    projectId &&
    storageBucket &&
    messagingSenderId &&
    appId &&
    vapidKey,
  );

  if (!hasConfig) {
    if (!hasWarnedMissingFirebaseConfig) {
      hasWarnedMissingFirebaseConfig = true;
      console.warn(
        "Firebase web push is disabled because env config is incomplete. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY and required Firebase variables.",
      );
    }

    return null;
  }

  return {
    firebase: {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    },
    vapidKey,
  };
}

export function isNotificationPermissionSupported(): boolean {
  return isBrowserEnvironment() && "Notification" in window;
}

export function isWebPushSupported(): boolean {
  return (
    isBrowserEnvironment() &&
    "serviceWorker" in navigator &&
    isNotificationPermissionSupported() &&
    (window.isSecureContext || window.location.hostname === "localhost")
  );
}

export function shouldEnableNotificationPush(roleId?: number): boolean {
  return (
    roleId === ROLES.ADMIN ||
    roleId === ROLES.COORDINATOR ||
    roleId === ROLES.MANAGER
  );
}

export async function requestNotificationPermissionIfNeeded(): Promise<NotificationPermission | null> {
  if (!isNotificationPermissionSupported()) {
    return null;
  }

  if (Notification.permission === "granted") {
    return Notification.permission;
  }

  if (Notification.permission === "denied") {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

export async function ensureNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) {
    return null;
  }

  return navigator.serviceWorker.register(NOTIFICATION_SERVICE_WORKER_PATH, {
    scope: "/",
    updateViaCache: "none",
  });
}

async function waitForServiceWorkerReady(
  registration: ServiceWorkerRegistration,
  timeoutMs = 8000,
): Promise<ServiceWorkerRegistration> {
  if (registration.active?.state === "activated") {
    return registration;
  }

  const fallbackRegistration = new Promise<ServiceWorkerRegistration>(
    (resolve) => {
      setTimeout(() => resolve(registration), timeoutMs);
    },
  );

  return Promise.race([navigator.serviceWorker.ready, fallbackRegistration]);
}

async function clearPushSubscription(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // Ignore subscription cleanup errors and continue.
  }
}

function getServiceWorkerScriptUrl(
  registration: ServiceWorkerRegistration,
): string | null {
  return (
    registration.active?.scriptURL ??
    registration.waiting?.scriptURL ??
    registration.installing?.scriptURL ??
    null
  );
}

function isNotificationServiceWorkerRegistration(
  registration: ServiceWorkerRegistration,
): boolean {
  const scriptUrl = getServiceWorkerScriptUrl(registration);
  if (!scriptUrl) {
    return false;
  }

  try {
    return new URL(scriptUrl).pathname === NOTIFICATION_SERVICE_WORKER_PATH;
  } catch {
    return scriptUrl.includes(NOTIFICATION_SERVICE_WORKER_PATH);
  }
}

export function isFcmRegistrationAbortError(error: unknown): boolean {
  const name =
    typeof error === "object" && error && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "";
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  return (
    name === "AbortError" ||
    /registration failed/i.test(message) ||
    /push service error/i.test(message)
  );
}

export async function resetNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) {
    return null;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const targetRegistrations = registrations.filter(
    isNotificationServiceWorkerRegistration,
  );

  for (const registration of targetRegistrations) {
    await clearPushSubscription(registration);
    await registration.unregister();
  }

  return ensureNotificationServiceWorker();
}

export async function getBrowserFcmToken(
  serviceWorkerRegistration: ServiceWorkerRegistration,
): Promise<string | null> {
  const envConfig = getFirebaseEnvConfig();
  if (!envConfig) {
    return null;
  }

  const [{ deleteApp, getApps, initializeApp }, messagingModule] =
    await Promise.all([import("firebase/app"), import("firebase/messaging")]);

  const isSupported = await messagingModule.isSupported();
  if (!isSupported) {
    return null;
  }

  let app = getApps().find(
    (candidate) => candidate.name === FIREBASE_WEB_PUSH_APP_NAME,
  );

  if (app) {
    const isStaleConfig =
      app.options.apiKey !== envConfig.firebase.apiKey ||
      app.options.projectId !== envConfig.firebase.projectId ||
      app.options.messagingSenderId !== envConfig.firebase.messagingSenderId;

    if (isStaleConfig) {
      await deleteApp(app).catch(() => null);
      app = undefined;
    }
  }

  if (!app) {
    app = initializeApp(envConfig.firebase, FIREBASE_WEB_PUSH_APP_NAME);
  }

  const readyRegistration = await waitForServiceWorkerReady(
    serviceWorkerRegistration,
  );
  const messaging = messagingModule.getMessaging(app);
  let token: string | null;

  try {
    token = await messagingModule.getToken(messaging, {
      vapidKey: envConfig.vapidKey,
      serviceWorkerRegistration: readyRegistration,
    });
  } catch (error) {
    if (!isFcmRegistrationAbortError(error)) {
      throw error;
    }

    await clearPushSubscription(readyRegistration);

    await messagingModule.deleteToken(messaging).catch(() => false);

    token = await messagingModule.getToken(messaging, {
      vapidKey: envConfig.vapidKey,
      serviceWorkerRegistration: readyRegistration,
    });
  }

  return token || null;
}

export function getStoredFcmRegistration(): StoredFcmRegistration | null {
  if (!isBrowserEnvironment()) {
    return null;
  }

  const raw = window.localStorage.getItem(FCM_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredFcmRegistration>;
    if (!parsed?.token) {
      return null;
    }

    return {
      token: parsed.token,
      userId: parsed.userId ?? null,
    };
  } catch {
    return null;
  }
}

export function setStoredFcmRegistration(data: StoredFcmRegistration): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  window.localStorage.setItem(FCM_STORAGE_KEY, JSON.stringify(data));
}

export function clearStoredFcmRegistration(): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  window.localStorage.removeItem(FCM_STORAGE_KEY);
}

export async function unregisterStoredFcmToken(): Promise<void> {
  const stored = getStoredFcmRegistration();
  if (!stored?.token) {
    return;
  }

  try {
    await unregisterFcmToken(stored.token);
  } catch {
    // Best-effort cleanup on logout.
  } finally {
    clearStoredFcmRegistration();
  }
}
