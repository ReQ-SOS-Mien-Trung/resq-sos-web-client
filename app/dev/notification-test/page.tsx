"use client";

import { useState } from "react";
import { useBroadcastAlertStore } from "@/stores/broadcast-alert.store";

/**
 * Dev-only page to test broadcast alert notifications.
 * Simulates a ReceiveBroadcastAlert SignalR event to verify:
 * 1. macOS native notification shows up
 * 2. In-app overlay alert shows up
 *
 * Visit: /dev/notification-test
 */
export default function NotificationTestPage() {
  const showAlert = useBroadcastAlertStore((s) => s.showAlert);
  const [permissionStatus, setPermissionStatus] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unknown",
  );
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  async function requestPermission() {
    if (!("Notification" in window)) {
      addLog("❌ Notification API không được hỗ trợ");
      return;
    }

    const result = await Notification.requestPermission();
    setPermissionStatus(result);
    addLog(`🔔 Permission result: ${result}`);
  }

  async function testOSNotification() {
    addLog("🧪 Gửi test macOS notification...");

    if (Notification.permission !== "granted") {
      addLog("❌ Chưa cấp quyền notification!");
      return;
    }

    try {
      // Method 1: ServiceWorker showNotification (preferred)
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("🌊 [TEST] Cảnh báo lũ lụt", {
          body: "Đây là test notification từ RESQ. Nếu bạn thấy trên macOS = frontend hoạt động đúng!",
          icon: "/icons/logo.svg",
          badge: "/icons/logo.svg",
          tag: `test-broadcast-${Date.now()}`,
          requireInteraction: true,
          data: { url: "/" },
        } as NotificationOptions);
        addLog("✅ showNotification() via ServiceWorker — kiểm tra macOS Notification Center!");
      } else {
        // Method 2: Fallback
        new Notification("🌊 [TEST] Cảnh báo lũ lụt", {
          body: "Đây là test notification từ RESQ.",
          icon: "/icons/logo.svg",
        });
        addLog("✅ new Notification() — kiểm tra macOS Notification Center!");
      }
    } catch (err) {
      addLog(`❌ Lỗi: ${err}`);
    }
  }

  function testInAppOverlay() {
    addLog("🧪 Hiện in-app overlay...");
    showAlert({
      id: Date.now(),
      title: "⚠️ [TEST] Cảnh báo lũ lụt khu vực TP.HCM",
      type: "FLOOD_WARNING",
      body: "Mực nước sông Sài Gòn đang dâng cao bất thường. Đây là test notification, nếu bạn thấy overlay = frontend hoạt động đúng!",
      sentAt: new Date().toISOString(),
    });
    addLog("✅ Overlay đã hiện");
  }

  function testBothTogether() {
    addLog("🧪 Test cả macOS notification + in-app overlay (giống thật)...");
    testOSNotification();
    testInAppOverlay();
  }

  async function checkServiceWorker() {
    addLog("🔍 Kiểm tra Service Worker...");
    if (!("serviceWorker" in navigator)) {
      addLog("❌ SW không hỗ trợ");
      return;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    addLog(`📋 Số SW đăng ký: ${registrations.length}`);
    for (const reg of registrations) {
      addLog(
        `  → ${reg.active?.scriptURL || reg.installing?.scriptURL || "unknown"} | state: ${reg.active?.state || "not-active"}`,
      );

      const sub = await reg.pushManager.getSubscription();
      addLog(
        sub
          ? `  → Push subscription: ${sub.endpoint.slice(0, 60)}...`
          : `  → ❌ Không có push subscription`,
      );
    }
  }

  async function checkFcmToken() {
    addLog("🔍 Kiểm tra FCM token trong localStorage...");
    const raw = localStorage.getItem("resq:fcm-registration");
    if (!raw) {
      addLog("❌ Chưa có FCM token (chưa đăng ký hoặc chưa đăng nhập)");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      addLog(`✅ FCM token: ${parsed.token?.slice(0, 30)}...`);
      addLog(`   userId: ${parsed.userId}`);
    } catch {
      addLog("❌ FCM data lỗi format");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">🔔 Notification Test</h1>

      {/* Status */}
      <div className="rounded-lg border p-4 space-y-2">
        <h2 className="font-semibold">Trạng thái</h2>
        <p>
          Permission:{" "}
          <span
            className={
              permissionStatus === "granted"
                ? "text-green-600 font-bold"
                : "text-red-600 font-bold"
            }
          >
            {permissionStatus}
          </span>
        </p>
        <p className="text-sm text-gray-500">
          macOS: System Settings → Notifications → Chrome/Edge → bật Allow Notifications
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={requestPermission}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          1. Cấp quyền Notification
        </button>
        <button
          onClick={testOSNotification}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          2. Test macOS Notification
        </button>
        <button
          onClick={testInAppOverlay}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          3. Test In-App Overlay
        </button>
        <button
          onClick={testBothTogether}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          4. Test cả hai (giống thật)
        </button>
      </div>

      {/* Diagnostics */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={checkServiceWorker}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          🔍 Check Service Worker
        </button>
        <button
          onClick={checkFcmToken}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          🔍 Check FCM Token
        </button>
      </div>

      {/* Log */}
      <div className="rounded-lg border bg-gray-950 p-4">
        <h2 className="mb-2 font-semibold text-white">Console Log</h2>
        <div className="max-h-80 overflow-y-auto space-y-1 font-mono text-xs text-green-400">
          {log.length === 0 && (
            <p className="text-gray-500">Nhấn nút để test...</p>
          )}
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm dark:bg-yellow-950/30 dark:border-yellow-700">
        <h3 className="font-bold text-yellow-800 dark:text-yellow-300 mb-2">
          ⚠️ Về việc &quot;tắt web vẫn hiện notification&quot;
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-yellow-900 dark:text-yellow-200">
          <li>
            <strong>Mở web (tab active / minimize)</strong>: SignalR nhận{" "}
            <code>ReceiveBroadcastAlert</code> → hiện macOS notification + overlay ✅
          </li>
          <li>
            <strong>Tắt tab / tắt browser</strong>: Chỉ có <strong>FCM push</strong> mới hiện
            được → Backend phải gọi{" "}
            <code>SubscribeToTopicAsync(token, &quot;all_users&quot;)</code> khi nhận FCM token
          </li>
          <li>
            Frontend đã đăng ký FCM token + Service Worker đầy đủ. Vấn đề là{" "}
            <strong>backend chưa subscribe token vào topic &quot;all_users&quot;</strong>
          </li>
        </ul>
      </div>
    </div>
  );
}
