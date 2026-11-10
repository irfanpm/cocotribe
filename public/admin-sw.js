// COCOTRIBE admin app: shows new-order notifications and opens the order when tapped.
// Nothing is cached, so the admin always sees live data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "COCOTRIBE", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "COCOTRIBE", {
      body: data.body || "Open the admin panel for details.",
      tag: data.tag,
      renotify: true,
      icon: "/admin-icon-192.png",
      badge: "/admin-badge-96.png",
      data: { url: data.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin + "/admin") && "focus" in client) {
          return client.navigate(target).then((c) => (c || client).focus());
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
