const express = require('express');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } },
        { isActive: true },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { displayName: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .limit(10)
    .select('username displayName avatar status');

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 