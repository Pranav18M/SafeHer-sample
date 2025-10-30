import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  triggerReason: {
    type: String,
    enum: ['timer_expired', 'voice_keyword', 'scream_detected', 'manual', 'panic_button'],
    required: true
  },
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: Date
  },
  vehicleType: String,
  vehicleNumber: String,
  message: {
    type: String,
    required: true
  },
  sentTo: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    },
    name: String,
    phone: String,
    smsStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    smsSentAt: Date,
    emailSentAt: Date
  }],
  status: {
    type: String,
    enum: ['sending', 'sent', 'failed', 'partial'],
    default: 'sending'
  },
  metadata: {
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Index for user alerts
alertSchema.index({ user: 1, createdAt: -1 });

// Auto-delete alerts older than 30 days
alertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('Alert', alertSchema);