import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['car', 'bike', 'auto', 'cab', 'walk'],
    required: true
  },
  vehicleNumber: {
    type: String,
    trim: true
  },
  driverNotes: {
    type: String,
    trim: true
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  scheduledEndTime: {
    type: Date,
    required: true
  },
  actualEndTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'alert_triggered'],
    default: 'active'
  },
  lastKnownLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: Date
  },
  locationHistory: [{
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: Date
  }],
  alertTriggered: {
    type: Boolean,
    default: false
  },
  alertReason: {
    type: String,
    enum: ['timer_expired', 'voice_keyword', 'scream_detected', 'manual', 'panic_button']
  },
  alertTime: {
    type: Date
  },
  endReason: {
    type: String,
    enum: ['user_stopped', 'timer_expired', 'alert_triggered', 'system']
  }
}, {
  timestamps: true
});

// Index for active sessions
sessionSchema.index({ user: 1, status: 1 });
sessionSchema.index({ scheduledEndTime: 1, status: 1 });

export default mongoose.models.Session || mongoose.model("Session", SessionSchema);
