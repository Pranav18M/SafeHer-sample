// ===============================================================
// FILE: public/firebase-messaging-sw.js
// ===============================================================

// Import Firebase compatibility SDKs
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyAoWYIf75M3VDGr5V0ZYsPSPGdlNyfb8tY",
  authDomain: "clean-technique-466902-b9.firebaseapp.com",
  projectId: "clean-technique-466902-b9",
  storageBucket: "clean-technique-466902-b9.firebasestorage.app",
  messagingSenderId: "511564354703",
  appId: "1:511564354703:web:850c44ea04ca8eb7f44cfa",
  measurementId: "G-9V0NBFHBVG"
});

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'SafeHer Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new alert',
    icon: payload.notification?.icon || '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'safeher-notification',
    requireInteraction: true,
    data: {
      url: payload.data?.url || '/',
      ...payload.data,
    },
    actions: [
      { action: 'view', title: 'View Alert' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw] Notification closed:', event);
});
