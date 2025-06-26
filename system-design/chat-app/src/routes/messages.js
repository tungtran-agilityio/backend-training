const express = require('express');
const Message = require('../models/message');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get conversation history
router.get('/conversation/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const conversationId = Message.generateConversationId(req.userId, otherUserId);
    const messages = await Message.getConversationHistory(conversationId, page, limit);
    
    res.json({
      conversationId,
      messages,
      page: parseInt(page),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 