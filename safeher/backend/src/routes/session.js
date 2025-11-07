// backend/routes/session.js
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// -----------------------------
// Session Schema (updated)
// -----------------------------
const locationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const sosContactSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    phone: { type: String, required: true }
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // location is now an object with lat/lon/accuracy/timestamp
    location: {
      type: locationSchema,
      required: true
    },

    // Vehicle details (optional)
    vehicleType: {
      type: String,
      enum: ["car", "bike", "auto", "cab", "walk", "other"],
      default: "other"
    },
    vehicleNumber: {
      type: String,
      default: ""
    },

    // SOS contacts — array of small objects {name, phone}
    sosContacts: {
      type: [sosContactSchema],
      default: []
    },

    active: {
      type: Boolean,
      default: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

// ================================================================
// ROUTE: GET /api/session/ → Test or List all sessions
// ================================================================
router.get("/", async (req, res) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      message: "Session routes working properly ✅",
      count: sessions.length,
      sessions
    });
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ success: false, message: "Failed to fetch sessions" });
  }
});

// ================================================================
// ROUTE: POST /api/session/start → Start new active session
// Expect body:
// {
//   userId: "...",
//   location: { latitude, longitude, accuracy?, timestamp? },
//   vehicleType?: "car" | "bike" | ...,
//   vehicleNumber?: "...",
//   sosContacts?: [{ name?, phone }, ...]
// }
// ================================================================
router.post("/start", async (req, res) => {
  try {
    const { userId, location, vehicleType, vehicleNumber, sosContacts } = req.body;

    // Basic validation
    if (!userId || !location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid fields. Required: userId and location.latitude/longitude"
      });
    }

    const session = new Session({
      userId,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? null,
        timestamp: location.timestamp ? new Date(location.timestamp) : new Date()
      },
      vehicleType: vehicleType ?? "other",
      vehicleNumber: vehicleNumber ?? "",
      sosContacts: Array.isArray(sosContacts) ? sosContacts.map(c => ({ name: c.name ?? null, phone: c.phone })) : []
    });

    await session.save();

    return res.status(201).json({
      success: true,
      message: "Session started successfully",
      session
    });
  } catch (err) {
    console.error("Error starting session:", err);
    res.status(500).json({ success: false, message: "Server error while starting session" });
  }
});

// ================================================================
// ROUTE: POST /api/session/end → End a session
// Expect body: { sessionId }
// ================================================================
router.post("/end", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Missing sessionId" });
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (!session.active) {
      return res.status(400).json({ success: false, message: "Session already ended" });
    }

    session.active = false;
    session.endedAt = new Date();
    await session.save();

    return res.json({
      success: true,
      message: "Session ended successfully",
      session
    });
  } catch (err) {
    console.error("Error ending session:", err);
    res.status(500).json({ success: false, message: "Server error while ending session" });
  }
});

// ================================================================
// ROUTE: GET /api/session/:userId → Get sessions by user
// ================================================================
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const sessions = await Session.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (err) {
    console.error("Error fetching user sessions:", err);
    res.status(500).json({ success: false, message: "Error fetching sessions" });
  }
});

// ================================================================
// EXPORT ROUTER
// ================================================================
export default router;
