import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { Shield, Play, Users, AlertCircle, Clock, MapPin } from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const { activeSession, checkActiveSession } = useSession();
  const [stats, setStats] = useState({
    totalSessions: 0,
    alertsTriggered: 0,
    emergencyContacts: 0
  });
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    checkActiveSession();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch alerts
      const alertsRes = await axios.get('/alerts');
      const alerts = alertsRes.data.alerts || [];
      setRecentAlerts(alerts.slice(0, 3));

      // Fetch contacts
      const contactsRes = await axios.get('/contacts');
      const contacts = contactsRes.data.contacts || [];

      setStats({
        totalSessions: alerts.length,
        alertsTriggered: alerts.length,
        emergencyContacts: contacts.length
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">Stay safe and connected</p>
        </div>

        {/* Active Session Alert */}
        {activeSession && (
          <Link to="/active-session">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-2xl shadow-lg mb-8 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-2">⚡ Safety Mode Active</h2>
                  <p className="text-red-50">
                    {activeSession.vehicleType.toUpperCase()} Session in progress
                  </p>
                </div>
                <div className="animate-pulse">
                  <Shield className="w-12 h-12" />
                </div>
              </div>
              <div className="mt-4 text-sm font-medium bg-white/20 inline-block px-4 py-2 rounded-full">
                Click to view session →
              </div>
            </div>
          </Link>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Start Safety Mode */}
          <Link to="/start-safety">
            <div className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-red-100 hover:border-red-300">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Start Safety Mode</h3>
                  <p className="text-sm text-gray-600">Track your journey with live monitoring</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Emergency Contacts */}
          <Link to="/contacts">
            <div className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-100 hover:border-blue-300">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Emergency Contacts</h3>
                  <p className="text-sm text-gray-600">Manage your trusted contacts</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
              <Clock className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Alerts Sent</p>
                <p className="text-3xl font-bold text-gray-900">{stats.alertsTriggered}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Emergency Contacts</p>
                <p className="text-3xl font-bold text-gray-900">{stats.emergencyContacts}</p>
              </div>
              <Users className="w-10 h-10 text-green-500" />
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Alerts</h2>
            <Link to="/alerts" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All →
            </Link>
          </div>

          {recentAlerts.length > 0 ? (
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">
                          {alert.triggerReason.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {alert.vehicleType?.toUpperCase()}
                          {alert.vehicleNumber && ` - ${alert.vehicleNumber}`}
                        </p>
                        {alert.location && (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${alert.location.latitude}&mlon=${alert.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                          >
                            <MapPin className="w-3 h-3" />
                            View Location
                          </a>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No alerts yet. Stay safe!</p>
            </div>
          )}
        </div>

        {/* Safety Tips */}
        <div className="mt-8 card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
          <h3 className="font-bold text-gray-900 mb-4">Safety Tips 💡</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Always inform someone about your travel plans</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Keep your phone charged and accessible</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Trust your instincts - if something feels wrong, it probably is</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Use SafeHer every time you travel, especially at night</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;