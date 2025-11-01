// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Function to register Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log(
            `✅ Service Worker registered with scope: ${registration.scope}`
          );
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    });
  } else {
    console.warn('⚠️ Service Worker not supported in this browser.');
  }
}

// Function to request Notification permission
function requestNotificationPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
        .then((permission) => {
          console.log('🔔 Notification permission:', permission);
        })
        .catch((error) => {
          console.error('❌ Notification permission request failed:', error);
        });
    }
  } else {
    console.warn('⚠️ Notifications not supported in this browser.');
  }
}

// Initialize PWA features
registerServiceWorker();
requestNotificationPermission();

// Render App
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
