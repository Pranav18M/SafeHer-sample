import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// ================================================================
// Mongoose Model for Session
// ================================================================
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

// ================================================================
// ROUTE: GET /api/session/ → Test or List all sessions
// ================================================================
router.get("/", async (req, res) => {
  try {
    const sessions = await Session.find();
    res.json({
      success: true,
      message: "Session routes working properly ✅",
      count: sessions.length,
      sessions,
    });
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ success: false, message: "Failed to fetch sessions" });
  }
});

// ================================================================
// ROUTE: POST /api/session/create → Create new active session
// ================================================================
router.post("/create", async (req, res) => {
  try {
    const { userId, location } = req.body;

    if (!userId || !location) {
      return res.status(400).json({ success: false, message: "Missing userId or location" });
    }

    const session = new Session({
      userId,
      location,
    });

    await session.save();

    return res.status(201).json({
      success: true,
      message: "Session created successfully",
      session,
    });
  } catch (err) {
    console.error("Error creating session:", err);
    res.status(500).json({ success: false, message: "Server error while creating session" });
  }
});

// ================================================================
// ROUTE: POST /api/session/end → End a session
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
      session,
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
      sessions,
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
