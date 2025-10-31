import express from 'express';
import Alert from '../models/Alert.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/alerts
// @desc    Get alert history for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const alerts = await Alert.find({ user: req.user.id })
      .populate('session', 'vehicleType vehicleNumber startTime')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Alert.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      count: alerts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      alerts: alerts.map(a => a.toJSON())
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch alerts' 
    });
  }
});

// @route   GET /api/alerts/:id
// @desc    Get single alert by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('session', 'vehicleType vehicleNumber startTime scheduledEndTime');

    if (!alert) {
      return res.status(404).json({ 
        success: false, 
        message: 'Alert not found' 
      });
    }

    res.json({
      success: true,
      alert: alert.toJSON()
    });
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch alert' 
    });
  }
});

// @route   DELETE /api/alerts/:id
// @desc    Delete single alert
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!alert) {
      return res.status(404).json({ 
        success: false, 
        message: 'Alert not found' 
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete alert' 
    });
  }
});

// @route   DELETE /api/alerts
// @desc    Delete all alerts for user
// @access  Private
router.delete('/', protect, async (req, res) => {
  try {
    const result = await Alert.deleteMany({ user: req.user.id });

    res.json({
      success: true,
      message: `${result.deletedCount} alert(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Clear alerts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear alerts' 
    });
  }
});

// @route   GET /api/alerts/stats/overview
// @desc    Get alert statistics for user
// @access  Private
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const totalAlerts = await Alert.countDocuments({ user: req.user.id });
    
    const alertsByReason = await Alert.aggregate([
      { $match: { user: req.user.id } },
      { $group: { _id: '$triggerReason', count: { $sum: 1 } } }
    ]);

    const alertsByStatus = await Alert.aggregate([
      { $match: { user: req.user.id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const recentAlerts = await Alert.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('triggerReason createdAt status');

    res.json({
      success: true,
      stats: {
        total: totalAlerts,
        byReason: alertsByReason,
        byStatus: alertsByStatus,
        recent: recentAlerts
      }
    });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch alert statistics' 
    });
  }
});

export default router;