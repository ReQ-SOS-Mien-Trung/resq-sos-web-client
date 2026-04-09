// ─── RESQ Push Notification Service Worker ────────────────────────────────────
// v3 – Firebase compat loaded (required for getToken), but our push handler
//       runs FIRST and blocks Firebase's default notification display.
// ───────────────────────────────────────────────────────────────────────────────

// ─── 1. Register OUR push handler BEFORE Firebase is loaded ────────────────────
//    This ensures our handler fires first. We call stopImmediatePropagation()
//    to prevent Firebase's handler from auto-showing a duplicate notification.
function toPositiveInt(value) {
  var parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveNotificationUrl(data) {
  if (data && typeof data.url === "string" && data.url.trim()) {
    return data.url.trim();
  }

  var sourceDepotId = toPositiveInt(data && data.sourceDepotId);
  var closureId = toPositiveInt(data && data.closureId);
  var transferId = toPositiveInt(data && data.transferId);

  if (sourceDepotId && closureId && transferId) {
    var params = new URLSearchParams({
      sourceDepotId: String(sourceDepotId),
      closureId: String(closureId),
      transferId: String(transferId),
    });
    return "/dashboard/inventory/depot-closure?" + params.toString();
  }

  return "/";
}

self.addEventListener('push', function(event) {
  event.stopImmediatePropagation();

  var title = "Thông báo từ RESQ";
  var body = "";
  var isBroadcastAlert = false;
  var targetUrl = "/";

  try {
    if (event.data) {
      var payload = event.data.json();
      var n = payload.notification || {};
      var d = payload.data || {};
      title = n.title || d.title || title;
      body  = n.body  || d.body  || body;
      isBroadcastAlert = d.type === "broadcast_alert";
      targetUrl = resolveNotificationUrl(d);
    }
  } catch (e) {
    try { if (event.data) body = event.data.text(); } catch (e2) { /* ignore */ }
  }

  var tag = isBroadcastAlert ? "broadcast-alert" : ("fcm-" + Date.now());

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: "/icons/logo-192.png",
      badge: "/icons/logo-192.png",
      tag: tag,
      requireInteraction: !!isBroadcastAlert,
      data: { url: targetUrl }
    })
  );
});

// ─── 2. Load Firebase messaging (needed so getToken() on main page works) ──────
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');
importScripts('/api/sw-firebase-init');
firebase.messaging();

// ─── 3. Activate immediately ───────────────────────────────────────────────────
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) { event.waitUntil(self.clients.claim()); });

// ─── 4. Handle notification click ──────────────────────────────────────────────
self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  var targetUrl = (event.notification && event.notification.data)
    ? event.notification.data.url || "/"
    : "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if ("focus" in client && client.url.indexOf(self.location.origin) !== -1) {
            client.postMessage({ type: "OPEN_URL", url: targetUrl });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
