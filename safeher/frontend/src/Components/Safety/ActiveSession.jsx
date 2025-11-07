import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import {
  Phone,
  PhoneOff,
  AlertTriangle,
  Square,
  Volume2,
  Mic,
  MapPin,
  Clock,
  Copy,
  PhoneOutgoing
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * ActiveSession.jsx
 * - Preserves original functionality
 * - Adds display for vehicle info and SOS contacts (sosContacts)
 * - Robust with different shapes of session/location coming from backend/localStorage
 */

const ActiveSession = () => {
  const navigate = useNavigate();
  const sessionCtx = useSession() || {}; // tolerant access to context
  // Support multiple naming conventions from different updates:
  const activeSession = sessionCtx.activeSession || sessionCtx.session || null;
  const locationFromCtx = sessionCtx.location || null;
  const timeRemaining = sessionCtx.timeRemaining ?? sessionCtx.remainingTime ?? 0;
  const stopSession = sessionCtx.stopSession || sessionCtx.endSession || (async () => ({ success: false, error: 'No stopSession' }));
  const triggerAlert = sessionCtx.triggerAlert || sessionCtx.sendAlert || (async () => ({ success: false, error: 'No triggerAlert' }));

  // UI & detection states
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [voiceDetectionActive, setVoiceDetectionActive] = useState(false);
  const [screamDetectionActive, setScreamDetectionActive] = useState(false);
  const [alertStatus, setAlertStatus] = useState('');
  const [isStoppingSession, setIsStoppingSession] = useState(false);

  // SOS contacts (from activeSession.sosContacts or activeSession.sos or activeSession.contacts)
  const [sosContacts, setSosContacts] = useState([]);

  // Resolved location object (latitude, longitude, accuracy, timestamp)
  const [location, setLocation] = useState(null);

  // audio / speech refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recognitionRef = useRef(null);

  // Keep a local mounted flag to avoid setState after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Resolve active session info into local state
    resolveActiveSessionData();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  useEffect(() => {
    // Build location: prefer context location, then session.location (string/object)
    if (locationFromCtx) {
      setLocation(normalizeLocation(locationFromCtx));
    } else if (activeSession) {
      // session may have `location` as object or JSON string or nested object
      const loc = activeSession.location || activeSession.currentLocation || activeSession.lastLocation || null;
      if (loc) {
        setLocation(normalizeLocation(loc));
      }
    }

    // Start detectors only if we have an activeSession
    if (activeSession) {
      startVoiceDetection();
      startScreamDetection();
    }

    // Show timer warning at T-2 minutes
    if (timeRemaining === 120) {
      showTimerWarning();
    }

    return () => {
      // cleanup detectors
      stopVoiceDetection();
      stopScreamDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, locationFromCtx, timeRemaining]);

  // --- Helpers --------------------------------------------------------------

  function normalizeLocation(loc) {
    // Accept multiple shapes:
    // - { latitude, longitude, accuracy, timestamp }
    // - { lat, lng, accuracy }
    // - stringified JSON of above
    // - legacy: "lat,lng,acc,timestamp"
    try {
      if (!loc) return null;

      if (typeof loc === 'string') {
        // try JSON parse
        try {
          const parsed = JSON.parse(loc);
          return normalizeLocation(parsed);
        } catch {
          // try comma separated
          const parts = loc.split(',').map(s => s.trim());
          if (parts.length >= 2) {
            const latitude = parseFloat(parts[0]);
            const longitude = parseFloat(parts[1]);
            const accuracy = parts[2] ? Number(parts[2]) : undefined;
            const timestamp = parts[3] ? Number(parts[3]) : Date.now();
            return { latitude, longitude, accuracy, timestamp };
          }
          return null;
        }
      }

      if (typeof loc === 'object') {
        const latitude = loc.latitude ?? loc.lat ?? loc.coords?.latitude ?? null;
        const longitude = loc.longitude ?? loc.lng ?? loc.coords?.longitude ?? null;
        const accuracy = loc.accuracy ?? loc.coords?.accuracy ?? loc.accuracyMeters ?? 50;
        const timestamp = loc.timestamp ?? loc.time ?? loc.coords?.timestamp ?? Date.now();

        if (latitude == null || longitude == null) return null;
        return {
          latitude: Number(latitude),
          longitude: Number(longitude),
          accuracy: Number(accuracy || 50),
          timestamp: Number(timestamp || Date.now())
        };
      }

      return null;
    } catch (err) {
      console.warn('normalizeLocation error', err);
      return null;
    }
  }

  function resolveActiveSessionData() {
    // Pull sosContacts and ensure shape
    const contacts =
      activeSession?.sosContacts ||
      activeSession?.sos ||
      activeSession?.contacts ||
      activeSession?.emergencyContacts ||
      [];
    setSosContacts(Array.isArray(contacts) ? contacts : []);

    // If there's a location field in session and no location set, parse it
    if (!location && activeSession?.location) {
      const parsed = normalizeLocation(activeSession.location);
      if (parsed) setLocation(parsed);
    }
  }

  // --- Voice Detection -----------------------------------------------------

  const startVoiceDetection = () => {
    if (!activeSession) return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        if (!mountedRef.current) return;
        setVoiceDetectionActive(true);
        console.log('✓ Voice detection started');
      };

      recognition.onresult = (event) => {
        if (!mountedRef.current) return;
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ')
          .toLowerCase();

        const keywords = [
          'help me', 'help', 'sos', 'emergency', 'danger',
          'im in danger', 'i am in danger', 'save me',
          'help pannung', 'kaapathung', 'uthavi',
          'bayam', 'danger', 'help pannunga', 'save'
        ];

        const detected = keywords.some(k => transcript.includes(k));
        if (detected) {
          console.log('⚠️ Emergency keyword detected:', transcript);
          recognition.stop();
          handleEmergencyAlert('voice_keyword');
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        // try to auto-restart on recoverable errors
        if (event.error !== 'no-speech' && mountedRef.current) {
          setTimeout(() => {
            try { recognition.start(); } catch (e) { /* ignore */ }
          }, 1000);
        }
      };

      recognition.onend = () => {
        if (!mountedRef.current) return;
        setVoiceDetectionActive(false);
        // auto restart while session active
        if (activeSession && mountedRef.current) {
          setTimeout(() => {
            try { recognition.start(); } catch (e) { /* ignore */ }
          }, 500);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start voice detection:', err);
    }
  };

  const stopVoiceDetection = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch (err) {
      console.warn('stopVoiceDetection error', err);
    } finally {
      setVoiceDetectionActive(false);
    }
  };

  // --- Scream detection (Web Audio) ----------------------------------------

  const startScreamDetection = async () => {
    if (!activeSession) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setScreamDetectionActive(true);

      monitorAudioLevels();

      console.log('✓ Scream detection started');
    } catch (err) {
      console.error('Failed to start scream detection:', err);
      setAlertStatus('Microphone access denied - scream detection disabled');
    }
  };

  const monitorAudioLevels = () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let consecutiveHighs = 0;
    const checkInterval = 100;
    const threshold = 180;
    const requiredHighs = 5;

    const checkAudio = () => {
      if (!mountedRef.current) return;
      if (!activeSession || !analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const peak = Math.max(...dataArray);

      if (peak > threshold) {
        consecutiveHighs++;
        if (consecutiveHighs >= requiredHighs) {
          console.log('⚠️ Loud sound/scream detected! Peak:', peak);
          consecutiveHighs = 0;
          handleEmergencyAlert('scream_detected');
          return;
        }
      } else {
        consecutiveHighs = 0;
      }

      setTimeout(checkAudio, checkInterval);
    };

    checkAudio();
  };

  const stopScreamDetection = () => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    } catch (err) {
      console.warn('stopScreamDetection error', err);
    } finally {
      setScreamDetectionActive(false);
    }
  };

  // --- Emergency actions ----------------------------------------------------

  const handleEmergencyAlert = async (reason) => {
    setAlertStatus('Sending emergency alerts...');
    try {
      const result = await triggerAlert(reason);
      if (result?.success) {
        setAlertStatus('✓ Emergency alerts sent to all contacts!');
        // optionally redirect after short delay
        setTimeout(() => {
          try { navigate('/dashboard'); } catch (e) {}
        }, 4000);
      } else {
        setAlertStatus(result?.error || 'Failed to send alerts. Please try again.');
      }
    } catch (err) {
      console.error('handleEmergencyAlert error', err);
      setAlertStatus('Failed to send alerts: ' + (err.message || 'unknown'));
    }
  };

  const handleStopSession = async () => {
    const confirmed = window.confirm('Are you sure you want to stop the safety session?');
    if (!confirmed) return;

    setIsStoppingSession(true);
    try {
      const result = await stopSession();
      if (result?.success) {
        navigate('/dashboard');
      } else {
        alert(result?.error || 'Failed to stop session. Please try again.');
        setIsStoppingSession(false);
      }
    } catch (err) {
      console.error('handleStopSession error', err);
      alert('Failed to stop session. Please try again.');
      setIsStoppingSession(false);
    }
  };

  // Fake call UI
  const handleFakeCall = () => {
    setShowFakeCall(true);

    const ringtone = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVKzn77BdGAg+ltryxnMpBS1+zPLaizsGGGS57OihUBELTKXh8bllHAU2jdXzz3wvBSl4yPDejUILElyx6OyrWBYJPJTV8sh0KwYqfMzx3I4+CRZhtuvqqVUSC0mi4fG2YhwENormzpRDBRE1aJ3M3mQYGT1tnNjz8ZnUXqKQ==');
    ringtone.loop = true;
    ringtone.play().catch(e => console.log('Ringtone play failed:', e));

    setTimeout(() => {
      ringtone.pause();
      ringtone.currentTime = 0;
      setShowFakeCall(false);
    }, 30000);
  };

  // Notifications
  const showTimerWarning = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SafeHer: Timer Ending Soon', {
        body: 'Your safety session will end in 2 minutes. Stop the session if you are safe.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true
      });
    }
  };

  // utility to copy phone number
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch (err) {
      console.error('copyToClipboard failed', err);
      alert('Copy failed');
    }
  };

  // format seconds -> mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If no active session or no location yet, show loader (preserves your original behavior)
  if (!activeSession || !location) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loader" />
      </div>
    );
  }

  // Helpers to safely read vehicle info
  const vehicleType = activeSession.vehicleType || activeSession.type || 'UNKNOWN';
  const vehicleNumber = activeSession.vehicleNumber || activeSession.plate || '';

  // Ensure sosContacts is up-to-date from activeSession when available
  useEffect(() => {
    const contacts =
      activeSession?.sosContacts ||
      activeSession?.sos ||
      activeSession?.contacts ||
      activeSession?.emergencyContacts ||
      sosContacts;
    if (Array.isArray(contacts)) setSosContacts(contacts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Safety Mode Active</h1>
            <p className="text-red-50 mt-1">
              {vehicleType?.toString().toUpperCase()}
              {vehicleNumber && ` - ${vehicleNumber}`}
            </p>
            {/* show session startedAt if present */}
            {activeSession?.startedAt && (
              <p className="text-xs text-red-100 mt-1">
                Started: {new Date(activeSession.startedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{formatTime(timeRemaining)}</div>
            <div className="text-sm text-red-50">Time Remaining</div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Mic className={`w-4 h-4 ${voiceDetectionActive ? 'animate-pulse' : ''}`} />
            <span>Voice: {voiceDetectionActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className={`w-4 h-4 ${screamDetectionActive ? 'animate-pulse' : ''}`} />
            <span>Sound: {screamDetectionActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>GPS: Active</span>
          </div>
        </div>
      </div>

      {/* Alert Status */}
      {alertStatus && (
        <div className={`p-4 ${alertStatus.includes('✓') ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border-l-4`}>
          <p className="text-sm font-medium">{alertStatus}</p>
        </div>
      )}

      {/* Timer Warning */}
      {timeRemaining <= 120 && timeRemaining > 0 && (
        <div className="p-4 bg-orange-50 border-l-4 border-orange-500">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold text-orange-800">Timer ending soon!</p>
              <p className="text-sm text-orange-700 mt-1">
                Stop the session if you're safe. Otherwise, emergency alerts will be sent automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="p-4">
        <div className="h-96 rounded-lg overflow-hidden shadow-lg border border-gray-200">
          <MapContainer
            center={[location.latitude, location.longitude]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            key={`${location.latitude}-${location.longitude}`}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={[location.latitude, location.longitude]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Your Current Location</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Accuracy: ±{Math.round(location.accuracy)}m
                  </p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[location.latitude, location.longitude]}
              radius={location.accuracy || 50}
              pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
            />
          </MapContainer>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 space-y-4">
        {/* Emergency Alert Button */}
        <button
          onClick={() => handleEmergencyAlert('manual')}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all pulse-ring flex items-center justify-center gap-3"
        >
          <AlertTriangle className="w-6 h-6" />
          SEND EMERGENCY ALERT NOW
        </button>

        {/* Fake Call Button */}
        <button
          onClick={handleFakeCall}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Trigger Fake Call
        </button>

        {/* Stop Session Button */}
        <button
          onClick={handleStopSession}
          disabled={isStoppingSession}
          className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Square className="w-5 h-5" />
          {isStoppingSession ? 'Stopping...' : 'Stop Safety Session'}
        </button>
      </div>

      {/* Vehicle + SOS Contacts Row */}
      <div className="px-4 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vehicle Info */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Vehicle Info</h3>
          <p className="text-sm text-gray-700">
            <strong>Type: </strong>{vehicleType?.toString() || '—'}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Number: </strong>{vehicleNumber || '—'}
          </p>
          {activeSession?.driverNotes && (
            <p className="text-sm text-gray-600 mt-2">Notes: {activeSession.driverNotes}</p>
          )}
        </div>

        {/* SOS Contacts */}
        <div className="card p-4 md:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-3">Emergency Contacts</h3>

          {Array.isArray(sosContacts) && sosContacts.length > 0 ? (
            <div className="space-y-3">
              {sosContacts.map((c, idx) => {
                // support multiple shapes: { name, phone }, string entries "Name|phone" or just phone
                let name = 'Contact';
                let phone = '';
                if (typeof c === 'string') {
                  if (c.includes('|')) {
                    const [n, p] = c.split('|').map(s => s.trim());
                    name = n || `Contact ${idx + 1}`;
                    phone = p || '';
                  } else {
                    phone = c;
                    name = `Contact ${idx + 1}`;
                  }
                } else if (typeof c === 'object') {
                  name = c.name || c.fullName || c.label || `Contact ${idx + 1}`;
                  phone = c.phone || c.mobile || c.number || c.contact || '';
                }

                return (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {name.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{name}</div>
                        <div className="text-sm text-gray-500">{phone || 'No phone'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {phone ? (
                        <>
                          <a
                            href={`tel:${phone}`}
                            className="p-2 bg-green-100 rounded-lg hover:bg-green-200 transition"
                            title={`Call ${name}`}
                          >
                            <PhoneOutgoing className="w-4 h-4 text-green-700" />
                          </a>
                          <button
                            onClick={() => copyToClipboard(phone)}
                            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                            title="Copy phone"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No number</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              No emergency contacts found for this session. Add contacts in the Contacts screen.
            </div>
          )}
        </div>
      </div>

      {/* Location Info */}
      <div className="px-4 mt-6">
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Current Location</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Latitude: {location.latitude.toFixed(6)}</p>
            <p>Longitude: {location.longitude.toFixed(6)}</p>
            <p>Accuracy: ±{Math.round(location.accuracy)} meters</p>
            <p>Last Updated: {new Date(location.timestamp).toLocaleTimeString()}</p>
          </div>
          <a
            href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Open in OpenStreetMap →
          </a>
        </div>
      </div>

      {/* Fake Call Screen Overlay */}
      {showFakeCall && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 z-50 flex flex-col items-center justify-center fake-call-screen">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Phone className="w-16 h-16 animate-bounce" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Emergency Contact</h2>
            <p className="text-xl text-gray-300 mb-8">Incoming Call...</p>

            <div className="flex gap-8 justify-center">
              <button
                onClick={() => setShowFakeCall(false)}
                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
              >
                <Phone className="w-8 h-8" />
              </button>
              <button
                onClick={() => setShowFakeCall(false)}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveSession;
