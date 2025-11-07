import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import { Car, Bike, Bus, Users as Cab, Footprints, AlertCircle, Play, Clock } from 'lucide-react';
import axios from 'axios';

const StartSafety = () => {
  const navigate = useNavigate();
  const { startSession } = useSession();

  const [contacts, setContacts] = useState([]);
  const [formData, setFormData] = useState({
    vehicleType: 'cab',
    vehicleNumber: '',
    driverNotes: '',
    durationMinutes: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    checkContacts();
    checkPermissions();
  }, []);

  const checkContacts = async () => {
    try {
      const response = await axios.get('/api/contacts');
      const contactList = response.data.contacts || [];
      setContacts(contactList);

      if (contactList.length === 0) {
        setError('Please add at least one emergency contact before starting a session');
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      // Location permission
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      // Notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      setPermissionsGranted(true);
    } catch (error) {
      console.error('Permissions error:', error);
      setError('Please grant location and microphone permissions to use Safety Mode');
    }
  };

  // ✅ Helper: Get location data
  const getLocation = () =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        (error) => reject(error)
      );
    });

  const vehicleTypes = [
    { value: 'car', label: 'Car', icon: Car, color: 'blue' },
    { value: 'bike', label: 'Bike', icon: Bike, color: 'green' },
    { value: 'auto', label: 'Auto', icon: Bus, color: 'yellow' },
    { value: 'cab', label: 'Cab', icon: Cab, color: 'purple' },
    { value: 'walk', label: 'Walk', icon: Footprints, color: 'gray' },
  ];

  const durationOptions = [
    { value: 10, label: '10 minutes' },
    { value: 20, label: '20 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
  ];

  // ✅ Submission Handler - Updated for location & contacts
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (contacts.length === 0) {
      setError('Please add at least one emergency contact first');
      return;
    }

    if (!permissionsGranted) {
      setError('Please grant all required permissions');
      await checkPermissions();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const location = await getLocation();
      const sessionData = {
        ...formData,
        sosContacts: contacts.map((c) => ({ name: c.name, phone: c.phone })),
        location, // ✅ include required location
      };

      console.log('🚀 Final sessionData:', sessionData);

      const result = await startSession(sessionData);

      if (result?.success) {
        navigate('/active-session');
      } else {
        setError(result?.error || 'Failed to start session');
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Error in session creation:', err);
      setError('Unable to start session. Location may not be accessible.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Safety Mode</h1>
          <p className="text-gray-600">
            Set up your safety session with live tracking and emergency alerts
          </p>
        </div>

        {/* Contacts Warning */}
        {contacts.length === 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">No emergency contacts added</p>
              <p className="text-sm text-red-600 mt-1">
                You need to add at least one emergency contact before starting a safety session.
              </p>
              <button
                onClick={() => navigate('/contacts')}
                className="mt-3 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Add Contacts Now
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && contacts.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700">{error}</p>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Vehicle Type Selection */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Vehicle Type</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {vehicleTypes.map((vehicle) => (
                <button
                  key={vehicle.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, vehicleType: vehicle.value })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.vehicleType === vehicle.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <vehicle.icon
                    className={`w-8 h-8 mx-auto mb-2 ${
                      formData.vehicleType === vehicle.value
                        ? 'text-red-600'
                        : 'text-gray-400'
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      formData.vehicleType === vehicle.value
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {vehicle.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Details */}
          {formData.vehicleType !== 'walk' && (
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Vehicle Details (Optional)</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle/Plate Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className="input-field"
                    placeholder="e.g., TN 01 AB 1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver/Additional Notes
                  </label>
                  <textarea
                    value={formData.driverNotes}
                    onChange={(e) => setFormData({ ...formData, driverNotes: e.target.value })}
                    className="input-field resize-none"
                    rows="3"
                    placeholder="Driver name, cab company, or any other details..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Duration Selection */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Set Session Duration</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, durationMinutes: option.value })}
                  className={`p-3 rounded-lg border-2 font-medium transition-all ${
                    formData.durationMinutes === option.value
                      ? 'border-red-500 bg-red-50 text-red-600'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-600">
              <Clock className="w-4 h-4 inline mr-1" />
              An alert will be sent automatically if the session isn't stopped within this time
            </p>
          </div>

          {/* Emergency Contacts Summary */}
          <div className="card bg-blue-50 border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Emergency Contacts</h2>
            <p className="text-sm text-gray-700 mb-3">
              Alerts will be sent to {contacts.length} contact
              {contacts.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              {contacts.slice(0, 3).map((contact) => (
                <div key={contact._id} className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{contact.name}</span>
                  <span className="text-gray-500">({contact.phone})</span>
                </div>
              ))}
              {contacts.length > 3 && (
                <p className="text-sm text-gray-600">
                  ...and {contacts.length - 3} more
                </p>
              )}
            </div>
          </div>

          {/* Permissions Check */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Required Permissions</h2>
            <div className="space-y-3">
              {['Location Access', 'Microphone Access', 'Notifications'].map(
                (perm, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        permissionsGranted
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {permissionsGranted ? '✓' : '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{perm}</p>
                      <p className="text-sm text-gray-600">
                        {perm === 'Location Access' && 'Required for live tracking'}
                        {perm === 'Microphone Access' &&
                          'Required for voice and sound detection'}
                        {perm === 'Notifications' &&
                          'Required for timer warnings'}
                      </p>
                    </div>
                  </div>
                )
              )}
              {!permissionsGranted && (
                <button
                  type="button"
                  onClick={checkPermissions}
                  className="mt-4 btn-secondary text-sm"
                >
                  Grant Permissions
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || contacts.length === 0 || !permissionsGranted}
            className="w-full btn-primary py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6" />
            {loading ? 'Starting Session...' : 'Start Safety Session'}
          </button>

          {/* Safety Note */}
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">🔒 Your safety is our priority</p>
            <p>
              Voice detection, sound monitoring, and GPS tracking will be active during your
              session
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartSafety;
