const express = require('express');
const { createClient } = require('redis');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Redis client configuration
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Connect to Redis
redisClient.connect().catch(console.error);

// Middleware
app.use(express.json());

// Example route to set cache
app.post('/cache/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = req.body.value;

    await redisClient.set(key, JSON.stringify(value));
    res.json({ success: true, message: 'Value cached successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Example route to get cache
app.get('/cache/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await redisClient.get(key);

    if (!value) {
      return res
        .status(404)
        .json({ success: false, message: 'Key not found in cache' });
    }

    res.json({ success: true, data: JSON.parse(value) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Example route to delete cache
app.delete('/cache/:key', async (req, res) => {
  try {
    const { key } = req.params;
    await redisClient.del(key);
    res.json({ success: true, message: 'Cache deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
