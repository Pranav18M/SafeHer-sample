import Alert from '../models/Alert.js';
import Session from '../models/Session.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import { decrypt } from '../utils/encryption.js';
import { sendSMS } from './twilioService.js';
import { sendEmail } from './emailService.js';

export const sendEmergencyAlert = async (sessionId, reason, customLocation = null) => {
  try {
    const session = await Session.findById(sessionId).populate('user');
    
    if (!session) {
      throw new Error('Session not found');
    }

    const user = session.user;
    const location = customLocation || session.lastKnownLocation;

    // Get emergency contacts
    const contacts = await Contact.find({ 
      user: user._id, 
      isActive: true 
    });

    if (contacts.length === 0) {
      console.warn('No emergency contacts found for user:', user._id);
    }

    // Create location link
    const locationLink = location 
      ? `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`
      : 'Location not available';

    // Create alert message
    const timestamp = new Date().toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const message = `🚨 EMERGENCY ALERT from SafeHer

${user.name} may be in danger!

Reason: ${formatAlertReason(reason)}
Time: ${timestamp}
Vehicle: ${session.vehicleType.toUpperCase()}${session.vehicleNumber ? ` (${session.vehicleNumber})` : ''}

📍 Location: ${locationLink}

Please check on them immediately!

- SafeHer Safety Team`;

    // Create alert record
    const sentTo = [];

    // Send alerts to each contact
    for (const contact of contacts) {
      const phoneNumber = decrypt(contact.encryptedPhone);
      const contactAlert = {
        contactId: contact._id,
        name: contact.name,
        phone: phoneNumber,
        smsStatus: 'pending',
        emailStatus: 'pending'
      };

      // Send SMS
      try {
        await sendSMS(phoneNumber, message);
        contactAlert.smsStatus = 'sent';
        contactAlert.smsSentAt = new Date();
      } catch (error) {
        console.error(`Failed to send SMS to ${contact.name}:`, error.message);
        contactAlert.smsStatus = 'failed';
      }

      // Send Email (if email available - use user email as reference)
      try {
        const emailSubject = `🚨 EMERGENCY: ${user.name} needs help!`;
        await sendEmail(user.email, emailSubject, message);
        contactAlert.emailStatus = 'sent';
        contactAlert.emailSentAt = new Date();
      } catch (error) {
        console.error(`Failed to send email for ${contact.name}:`, error.message);
        contactAlert.emailStatus = 'failed';
      }

      sentTo.push(contactAlert);
    }

    // Determine overall status
    const allSent = sentTo.every(c => c.smsStatus === 'sent' || c.emailStatus === 'sent');
    const noneFailed = sentTo.every(c => c.smsStatus !== 'failed' && c.emailStatus !== 'failed');
    const status = allSent ? 'sent' : (noneFailed ? 'sending' : 'partial');

    // Create alert record
    const alert = await Alert.create({
      user: user._id,
      session: sessionId,
      triggerReason: reason,
      location,
      vehicleType: session.vehicleType,
      vehicleNumber: session.vehicleNumber,
      message,
      sentTo,
      status
    });

    console.log(`✓ Alert created for session ${sessionId}`);

    return alert;
  } catch (error) {
    console.error('Send emergency alert error:', error);
    throw error;
  }
};

const formatAlertReason = (reason) => {
  const reasons = {
    'timer_expired': 'Safety timer expired without confirmation',
    'voice_keyword': 'Emergency keyword detected',
    'scream_detected': 'Distress sound detected',
    'manual': 'Manual emergency button pressed',
    'panic_button': 'Panic button activated'
  };
  return reasons[reason] || reason;
};