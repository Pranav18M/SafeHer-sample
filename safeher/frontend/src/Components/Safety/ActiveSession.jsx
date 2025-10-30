import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Phone, PhoneOff, AlertTriangle, Square, Volume2, Mic, MapPin, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ActiveSession = () => {
  const navigate = useNavigate();
  const { activeSession, location, timeRemaining, stopSession, triggerAlert } = useSession();
  
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [voiceDetectionActive, setVoiceDetectionActive] = useState(false);
  const [screamDetectionActive, setScreamDetectionActive] = useState(false);
  const [alertStatus, setAlertStatus] = useState('');
  const [isStoppingSession, setIsStoppingSession] = useState(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!activeSession) {
      navigate('/start-safety');
      return;
    }

    // Start voice and scream detection
    startVoiceDetection();
    startScreamDetection();

    // Show warning notification at T-2 minutes
    if (timeRemaining === 120) {
      showTimerWarning();
    }

    return () => {
      stopVoiceDetection();
      stopScreamDetection();
    };
  }, [activeSession, timeRemaining]);

  // Voice keyword detection using Web Speech API
  const startVoiceDetection = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // English (India) - supports Tamil-English mix

    recognition.onstart = () => {
      setVoiceDetectionActive(true);
      console.log('✓ Voice detection started');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript.toLowerCase())
        .join('');

      // Emergency keywords (English and Thanglish)
      const keywords = [
        'help me', 'help', 'sos', 'emergency', 'danger',
        'im in danger', 'i am in danger', 'save me',
        'help pannung', 'kaapathung', 'uthavi',
        'bayam', 'danger', 'help pannunga'
      ];

      const detected = keywords.some(keyword => transcript.includes(keyword));

      if (detected) {
        console.log('⚠️ Emergency keyword detected:', transcript);
        handleEmergencyAlert('voice_keyword');
        recognition.stop();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error('Failed to restart recognition:', e);
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      setVoiceDetectionActive(false);
      // Auto-restart
      if (activeSession) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error('Failed to restart recognition:', e);
          }
        }, 500);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Failed to start voice detection:', error);
    }
  };

  const stopVoiceDetection = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setVoiceDetectionActive(false);
    }
  };

  // Scream detection using Web Audio API
  const startScreamDetection = async () => {
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

      // Monitor audio levels
      monitorAudioLevels();

      console.log('✓ Scream detection started');
    } catch (error) {
      console.error('Failed to start scream detection:', error);
      setAlertStatus('Microphone access denied - scream detection disabled');
    }
  };

  const monitorAudioLevels = () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let consecutiveHighs = 0;
    const checkInterval = 100; // Check every 100ms
    const threshold = 180; // Loudness threshold (0-255)
    const requiredHighs = 5; // Need 5 consecutive highs (500ms)

    const checkAudio = () => {
      if (!activeSession || !analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
      
      // Get peak volume
      const peak = Math.max(...dataArray);

      if (peak > threshold) {
        consecutiveHighs++;
        if (consecutiveHighs >= requiredHighs) {
          console.log('⚠️ Loud sound/scream detected! Peak:', peak, 'Avg:', average);
          handleEmergencyAlert('scream_detected');
          consecutiveHighs = 0;
          return; // Stop monitoring after detection
        }
      } else {
        consecutiveHighs = 0;
      }

      setTimeout(checkAudio, checkInterval);
    };

    checkAudio();
  };

  const stopScreamDetection = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
      setScreamDetectionActive(false);
    }
  };

  const handleEmergencyAlert = async (reason) => {
    setAlertStatus('Sending emergency alerts...');
    
    const result = await triggerAlert(reason);
    
    if (result.success) {
      setAlertStatus('✓ Emergency alerts sent to all contacts!');
      // Auto-redirect after 5 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 5000);
    } else {
      setAlertStatus('Failed to send alerts. Please try again.');
    }
  };

  const handleStopSession = async () => {
    const confirmed = window.confirm('Are you sure you want to stop the safety session?');
    if (!confirmed) return;

    setIsStoppingSession(true);
    const result = await stopSession();
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      alert('Failed to stop session. Please try again.');
      setIsStoppingSession(false);
    }
  };

  const handleFakeCall = () => {
    setShowFakeCall(true);
    
    // Play ringtone
    const ringtone = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVKzn77BdGAg+ltryxnMpBS1+zPLaizsGGGS57OihUBELTKXh8bllHAU2jdXzz3wvBSl4yPDejUILElyx6OyrWBYJPJTV8sh0KwYqfMzx3I4+CRZhtuvqqVUSC0mi4fG2YhwENormzpRDBRE1aJ3M3mQYGT1tnNjz8ZnUXqKQ==');
    ringtone.loop = true;
    ringtone.play().catch(e => console.log('Ringtone play failed:', e));

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      ringtone.pause();
      ringtone.currentTime = 0;
    }, 30000);
  };

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeSession || !location) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Safety Mode Active</h1>
            <p className="text-red-50 mt-1">
              {activeSession.vehicleType.toUpperCase()}
              {activeSession.vehicleNumber && ` - ${activeSession.vehicleNumber}`}
            </p>
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
        <div className={`p-4 ${
          alertStatus.includes('✓') ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        } border-l-4`}>
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

      {/* Location Info */}
      <div className="px-4 mt-6">
        <div className="card">
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