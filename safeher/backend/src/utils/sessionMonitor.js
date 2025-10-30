import Session from '../models/Session.js';
import { sendEmergencyAlert } from '../services/alertService.js';

// Store scheduled alerts in memory
const scheduledAlerts = new Map();

export const scheduleAlert = (sessionId, scheduledTime) => {
  const now = new Date();
  const delay = scheduledTime.getTime() - now.getTime();
  
  // Add grace period (2 minutes)
  const gracePeriod = parseInt(process.env.ALERT_GRACE_PERIOD) || 120000; // 2 minutes
  const totalDelay = delay + gracePeriod;

  if (totalDelay > 0) {
    const timeoutId = setTimeout(async () => {
      await triggerTimerExpiredAlert(sessionId);
      scheduledAlerts.delete(sessionId.toString());
    }, totalDelay);

    scheduledAlerts.set(sessionId.toString(), timeoutId);
    console.log(`✓ Scheduled alert for session ${sessionId} in ${totalDelay}ms`);
  }
};

export const cancelScheduledAlert = (sessionId) => {
  const timeoutId = scheduledAlerts.get(sessionId.toString());
  if (timeoutId) {
    clearTimeout(timeoutId);
    scheduledAlerts.delete(sessionId.toString());
    console.log(`✓ Cancelled alert for session ${sessionId}`);
  }
};

const triggerTimerExpiredAlert = async (sessionId) => {
  try {
    const session = await Session.findById(sessionId);
    
    if (!session || session.status !== 'active') {
      console.log(`Session ${sessionId} not active, skipping alert`);
      return;
    }

    console.log(`⚠️ Timer expired for session ${sessionId}, sending alert...`);
    
    await sendEmergencyAlert(sessionId, 'timer_expired');

    session.status = 'alert_triggered';
    session.alertTriggered = true;
    session.alertReason = 'timer_expired';
    session.alertTime = new Date();
    await session.save();

    console.log(`✓ Alert sent for session ${sessionId}`);
  } catch (error) {
    console.error(`Failed to trigger alert for session ${sessionId}:`, error);
  }
};

// Check for expired sessions on server start
export const checkExpiredSessions = async () => {
  try {
    const now = new Date();
    const gracePeriod = parseInt(process.env.ALERT_GRACE_PERIOD) || 120000;
    const cutoffTime = new Date(now.getTime() - gracePeriod);

    const expiredSessions = await Session.find({
      status: 'active',
      scheduledEndTime: { $lte: cutoffTime }
    });

    for (const session of expiredSessions) {
      console.log(`⚠️ Found expired session ${session._id}, triggering alert`);
      await triggerTimerExpiredAlert(session._id);
    }

    // Re-schedule alerts for active sessions that haven't expired
    const activeSessions = await Session.find({
      status: 'active',
      scheduledEndTime: { $gt: cutoffTime }
    });

    for (const session of activeSessions) {
      scheduleAlert(session._id, session.scheduledEndTime);
    }
  } catch (error) {
    console.error('Error checking expired sessions:', error);
  }
};