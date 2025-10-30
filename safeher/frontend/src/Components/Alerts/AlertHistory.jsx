import React, { useState, useEffect } from 'react';
import { AlertCircle, MapPin, Clock, Trash2, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const AlertHistory = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('/alerts');
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all alert history?')) {
      return;
    }

    try {
      await axios.delete('/alerts');
      setAlerts([]);
    } catch (error) {
      alert('Failed to clear alerts');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-50';
      case 'partial':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getReasonLabel = (reason) => {
    const labels = {
      'timer_expired': 'Timer Expired',
      'voice_keyword': 'Voice Detected',
      'scream_detected': 'Sound Detected',
      'manual': 'Manual Alert',
      'panic_button': 'Panic Button'
    };
    return labels[reason] || reason;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Alert History</h1>
            <p className="text-gray-600">View all emergency alerts sent</p>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="card text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No alerts yet</h3>
            <p className="text-gray-600">
              Your emergency alert history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        {getReasonLabel(alert.triggerReason)}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(alert.createdAt), 'PPp')}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                    {alert.status}
                  </span>
                </div>

                {/* Vehicle Info */}
                {alert.vehicleType && (
                  <div className="mb-4 text-sm">
                    <span className="font-medium text-gray-900">Vehicle: </span>
                    <span className="text-gray-600">
                      {alert.vehicleType.toUpperCase()}
                      {alert.vehicleNumber && ` - ${alert.vehicleNumber}`}
                    </span>
                  </div>
                )}

                {/* Location */}
                {alert.location && (
                  <div className="mb-4">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${alert.location.latitude}&mlon=${alert.location.longitude}#map=15/${alert.location.latitude}/${alert.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <MapPin className="w-4 h-4" />
                      View Location on Map →
                    </a>
                  </div>
                )}

                {/* Contacts Sent To */}
                {alert.sentTo && alert.sentTo.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-900 mb-3">
                      Alerts sent to {alert.sentTo.length} contact{alert.sentTo.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {alert.sentTo.map((contact, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
                            {contact.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{contact.name}</p>
                            <div className="flex gap-2 text-xs">
                              <span className={`flex items-center gap-1 ${
                                contact.smsStatus === 'sent' ? 'text-green-600' : 'text-gray-400'
                              }`}>
                                {contact.smsStatus === 'sent' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                SMS
                              </span>
                              <span className={`flex items-center gap-1 ${
                                contact.emailStatus === 'sent' ? 'text-green-600' : 'text-gray-400'
                              }`}>
                                {contact.emailStatus === 'sent' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                Email
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertHistory;