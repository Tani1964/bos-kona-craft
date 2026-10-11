/* Craft Passport messaging worker — separate from the PWA cache worker. */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

// Registered BEFORE Firebase so our handler wins over its default (which opens "/").
self.addEventListener("notificationclick", (event) => {
  const d = event.notification?.data || {};
  const path = d.path || d.FCM_MSG?.data?.path || d.FCM_MSG?.notification?.click_action || "/me";
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          return client.navigate(path).then((c) => (c || client).focus());
        }
      }
      return self.clients.openWindow(path);
    }),
  );
});

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
firebase.messaging();
