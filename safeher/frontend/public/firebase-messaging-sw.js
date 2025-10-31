importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// IMPORTANT: Replace these values with your actual Firebase config
firebase.initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
});

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Received background message:', payload);
  
  // Customize notification
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
      ...payload.data
    },
    actions: [
      {
        action: 'view',
        title: 'View Alert'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    // Open the app
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if not open
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
