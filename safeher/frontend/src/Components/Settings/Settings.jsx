import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Phone, Shield, Bell, Trash2, Lock } from 'lucide-react';

const Settings = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all your data? This action cannot be undone.')) {
      // Implement clear data logic
      alert('Data cleared successfully');
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Implement delete account logic
      alert('Account deletion requested');
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-gray-900">{user?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <p className="mt-1 text-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </label>
              <p className="mt-1 text-gray-900">{user?.phone}</p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Push Notifications</p>
              <p className="text-sm text-gray-600">Receive alerts and reminders</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Security Section */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Privacy
          </h2>
          <div className="space-y-4">
            <button className="w-full btn-secondary flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              Change Password
            </button>
            <p className="text-sm text-gray-600">
              All your emergency contacts are encrypted and stored securely. Your location data is automatically deleted after 24 hours.
            </p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-2 border-red-200">
          <h2 className="text-xl font-bold text-red-600 mb-6 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </h2>
          <div className="space-y-4">
            <div>
              <button
                onClick={handleClearData}
                className="w-full btn-secondary bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
              >
                Clear All Data
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Remove all your sessions, alerts, and contacts. Your account will remain active.
              </p>
            </div>
            <div className="pt-4 border-t border-red-200">
              <button
                onClick={handleDeleteAccount}
                className="w-full btn-danger"
              >
                Delete Account
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>SafeHer v1.0.0</p>
          <p className="mt-1">Built with ❤️ for women's safety</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;