self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const notification = payload.notification || payload.data || payload;
  const title = notification.title || "Thong bao moi";

  const options = {
    body: notification.body || "Ban co thong bao moi tu RESQ.",
    icon: "/icons/logo.svg",
    badge: "/icons/logo.svg",
    data: {
      url: notification.click_action || notification.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client && client.url.includes(self.location.origin)) {
            client.postMessage({ type: "OPEN_URL", url: targetUrl });
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
