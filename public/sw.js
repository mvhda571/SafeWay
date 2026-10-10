self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "SafeWay", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.hazardId ?? "safeway",
      renotify: true,
      data: { url: data.url ?? "/map" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const target = event.notification.data?.url ?? "/map";
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((all) => {
        const existing = all.find((c) => c.url.includes(target));
        if (existing) return existing.focus();
        return clients.openWindow(target);
      }),
  );
});
