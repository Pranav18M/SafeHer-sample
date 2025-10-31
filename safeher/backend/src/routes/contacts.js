import express from 'express';
import { body, validationResult } from 'express-validator';
import Contact from '../models/Contact.js';
import { protect } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const router = express.Router();

// ================================================================
// @route   GET /api/contacts
// @desc    Get all contacts for logged in user
// @access  Private
// ================================================================
router.get('/', protect, async (req, res) => {
  try {
    const contacts = await Contact.find({ 
      user: req.user.id, 
      isActive: true 
    }).sort({ isPrimary: -1, createdAt: -1 });

    // Decrypt phone numbers before sending
    const decryptedContacts = contacts.map(contact => {
      const contactObj = contact.toObject();
      try {
        contactObj.phone = decrypt(contact.encryptedPhone);
      } catch (error) {
        console.error('Decryption error for contact:', contact._id, error);
        contactObj.phone = 'Error decrypting';
      }
      delete contactObj.encryptedPhone; // Remove encrypted field from response
      return contactObj;
    });

    console.log(`✅ Fetched ${decryptedContacts.length} contacts for user: ${req.user.email}`);

    res.json({
      success: true,
      count: decryptedContacts.length,
      contacts: decryptedContacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contacts' 
    });
  }
});

// ================================================================
// @route   GET /api/contacts/:id
// @desc    Get single contact by ID
// @access  Private
// ================================================================
router.get('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contact not found' 
      });
    }

    const contactObj = contact.toObject();
    try {
      contactObj.phone = decrypt(contact.encryptedPhone);
    } catch (error) {
      console.error('Decryption error:', error);
      contactObj.phone = 'Error decrypting';
    }
    delete contactObj.encryptedPhone;

    res.json({
      success: true,
      contact: contactObj
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contact' 
    });
  }
});

// ================================================================
// @route   POST /api/contacts
// @desc    Add new emergency contact
// @access  Private
// ================================================================
router.post('/', protect, [
  body('name')
    .trim()
    .notEmpty().withMessage('Contact name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be exactly 10 digits'),
  body('relationship')
    .optional()
    .isIn(['family', 'friend', 'colleague', 'other']).withMessage('Invalid relationship type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    // Check contact limit (max 5 contacts)
    const contactCount = await Contact.countDocuments({ 
      user: req.user.id, 
      isActive: true 
    });

    if (contactCount >= 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum 5 emergency contacts allowed. Please delete an existing contact first.' 
      });
    }

    const { name, phone, relationship, isPrimary } = req.body;

    // Check if contact with same phone already exists for this user
    const existingContact = await Contact.findOne({
      user: req.user.id,
      phone: phone,
      isActive: true
    });

    if (existingContact) {
      return res.status(400).json({ 
        success: false, 
        message: 'This phone number is already added as an emergency contact' 
      });
    }

    // Encrypt phone number
    let encryptedPhone;
    try {
      encryptedPhone = encrypt(phone);
    } catch (error) {
      console.error('Encryption error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to encrypt phone number' 
      });
    }

    // Create contact
    const contact = await Contact.create({
      user: req.user.id,
      name: name.trim(),
      phone,
      encryptedPhone,
      relationship: relationship || 'family',
      isPrimary: contactCount === 0 ? true : (isPrimary || false)
    });

    // Return contact with decrypted phone
    const contactObj = contact.toObject();
    contactObj.phone = phone;
    delete contactObj.encryptedPhone;

    console.log(`✅ New contact added for user ${req.user.email}: ${name}`);

    res.status(201).json({
      success: true,
      message: 'Emergency contact added successfully',
      contact: contactObj
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add contact' 
    });
  }
});

// ================================================================
// @route   PUT /api/contacts/:id
// @desc    Update emergency contact
// @access  Private
// ================================================================
router.put('/:id', protect, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be exactly 10 digits'),
  body('relationship')
    .optional()
    .isIn(['family', 'friend', 'colleague', 'other']).withMessage('Invalid relationship type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: errors.array()[0].msg 
      });
    }

    const { name, phone, relationship, isPrimary } = req.body;

    let contact = await Contact.findOne({ 
      _id: req.params.id, 
      user: req.user.id,
      isActive: true
    });

    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contact not found' 
      });
    }

    // If phone is being updated, check if it's already used
    if (phone && phone !== contact.phone) {
      const existingContact = await Contact.findOne({
        user: req.user.id,
        phone: phone,
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existingContact) {
        return res.status(400).json({ 
          success: false, 
          message: 'This phone number is already added as an emergency contact' 
        });
      }
    }

    // Update fields
    if (name) contact.name = name.trim();
    if (relationship) contact.relationship = relationship;
    if (isPrimary !== undefined) contact.isPrimary = isPrimary;
    
    if (phone && phone !== contact.phone) {
      contact.phone = phone;
      try {
        contact.encryptedPhone = encrypt(phone);
      } catch (error) {
        console.error('Encryption error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to encrypt phone number' 
        });
      }
    }

    await contact.save();

    // Return contact with decrypted phone
    const contactObj = contact.toObject();
    try {
      contactObj.phone = decrypt(contact.encryptedPhone);
    } catch (error) {
      contactObj.phone = phone || contact.phone;
    }
    delete contactObj.encryptedPhone;

    console.log(`✅ Contact updated for user ${req.user.email}: ${contact.name}`);

    res.json({
      success: true,
      message: 'Contact updated successfully',
      contact: contactObj
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update contact' 
    });
  }
});

// ================================================================
// @route   DELETE /api/contacts/:id
// @desc    Delete emergency contact (soft delete)
// @access  Private
// ================================================================
router.delete('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      user: req.user.id,
      isActive: true
    });

    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contact not found' 
      });
    }

    // Soft delete - set isActive to false
    contact.isActive = false;
    await contact.save();

    console.log(`✅ Contact deleted for user ${req.user.email}: ${contact.name}`);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete contact' 
    });
  }
});

// ================================================================
// @route   DELETE /api/contacts
// @desc    Delete all contacts for user
// @access  Private
// ================================================================
router.delete('/', protect, async (req, res) => {
  try {
    const result = await Contact.updateMany(
      { user: req.user.id, isActive: true },
      { isActive: false }
    );

    console.log(`✅ All contacts deleted for user ${req.user.email}: ${result.modifiedCount} contacts`);

    res.json({
      success: true,
      message: 'All contacts deleted successfully',
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Delete all contacts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete contacts' 
    });
  }
});

// ================================================================
// @route   GET /api/contacts/stats/count
// @desc    Get contact count for user
// @access  Private
// ================================================================
router.get('/stats/count', protect, async (req, res) => {
  try {
    const count = await Contact.countDocuments({ 
      user: req.user.id, 
      isActive: true 
    });

    res.json({
      success: true,
      count,
      maxAllowed: 5,
      canAddMore: count < 5
    });
  } catch (error) {
    console.error('Get contact count error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get contact count' 
    });
  }
});

export default router;