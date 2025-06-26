const { createClient } = require('redis');
const config = require('../config');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Main client for general operations
      this.client = createClient({
        url: config.redis.url,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached');
            return new Error('Max retry attempts reached');
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Separate clients for pub/sub
      this.subscriber = createClient({ url: config.redis.url });
      this.publisher = createClient({ url: config.redis.url });

      // Event handlers
      this.client.on('error', (err) => logger.error('Redis Client Error:', err));
      this.subscriber.on('error', (err) => logger.error('Redis Subscriber Error:', err));
      this.publisher.on('error', (err) => logger.error('Redis Publisher Error:', err));

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      this.isConnected = true;
      logger.info('Redis clients connected successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis clients:', error);
      throw error;
    }
  }

  // Service Discovery Methods
  async registerService(serviceId, serviceInfo) {
    try {
      const key = `${config.redis.keyPrefix}service:${serviceId}`;
      const value = JSON.stringify({
        ...serviceInfo,
        timestamp: Date.now(),
        heartbeat: Date.now()
      });

      await this.client.setEx(key, 60, value); // TTL 60 seconds
      logger.info(`Service registered: ${serviceId}`);
    } catch (error) {
      logger.error('Failed to register service:', error);
      throw error;
    }
  }

  async unregisterService(serviceId) {
    try {
      const key = `${config.redis.keyPrefix}service:${serviceId}`;
      await this.client.del(key);
      logger.info(`Service unregistered: ${serviceId}`);
    } catch (error) {
      logger.error('Failed to unregister service:', error);
      throw error;
    }
  }

  async getService(serviceId) {
    try {
      const key = `${config.redis.keyPrefix}service:${serviceId}`;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Failed to get service:', error);
      return null;
    }
  }

  async getAllServices() {
    try {
      const pattern = `${config.redis.keyPrefix}service:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) return [];

      const values = await this.client.mGet(keys);
      return values
        .filter(value => value !== null)
        .map(value => JSON.parse(value));
    } catch (error) {
      logger.error('Failed to get all services:', error);
      return [];
    }
  }

  async updateServiceHeartbeat(serviceId) {
    try {
      const key = `${config.redis.keyPrefix}service:${serviceId}`;
      const serviceInfo = await this.getService(serviceId);
      
      if (serviceInfo) {
        serviceInfo.heartbeat = Date.now();
        await this.client.setEx(key, 60, JSON.stringify(serviceInfo));
      }
    } catch (error) {
      logger.error('Failed to update service heartbeat:', error);
    }
  }

  // User Presence Methods
  async setUserPresence(userId, status, serviceId) {
    try {
      const key = `${config.redis.keyPrefix}presence:${userId}`;
      const value = JSON.stringify({
        status,
        serviceId,
        timestamp: Date.now()
      });

      await this.client.setEx(key, config.redis.ttl.presence, value);
      
      // Publish presence update
      await this.publishPresenceUpdate(userId, status, serviceId);
      
      logger.debug(`User presence set: ${userId} -> ${status}`);
    } catch (error) {
      logger.error('Failed to set user presence:', error);
      throw error;
    }
  }

  async getUserPresence(userId) {
    try {
      const key = `${config.redis.keyPrefix}presence:${userId}`;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Failed to get user presence:', error);
      return null;
    }
  }

  async removeUserPresence(userId) {
    try {
      const key = `${config.redis.keyPrefix}presence:${userId}`;
      await this.client.del(key);
      
      // Publish presence update
      await this.publishPresenceUpdate(userId, 'offline', null);
      
      logger.debug(`User presence removed: ${userId}`);
    } catch (error) {
      logger.error('Failed to remove user presence:', error);
    }
  }

  async getUsersByService(serviceId) {
    try {
      const pattern = `${config.redis.keyPrefix}presence:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) return [];

      const values = await this.client.mGet(keys);
      const users = [];

      for (let i = 0; i < keys.length; i++) {
        if (values[i]) {
          const presence = JSON.parse(values[i]);
          if (presence.serviceId === serviceId) {
            const userId = keys[i].split(':').pop();
            users.push({ userId, ...presence });
          }
        }
      }

      return users;
    } catch (error) {
      logger.error('Failed to get users by service:', error);
      return [];
    }
  }

  // Session Management
  async setUserSession(userId, sessionData) {
    try {
      const key = `${config.redis.keyPrefix}session:${userId}`;
      await this.client.setEx(key, config.redis.ttl.session, JSON.stringify(sessionData));
    } catch (error) {
      logger.error('Failed to set user session:', error);
      throw error;
    }
  }

  async getUserSession(userId) {
    try {
      const key = `${config.redis.keyPrefix}session:${userId}`;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Failed to get user session:', error);
      return null;
    }
  }

  async removeUserSession(userId) {
    try {
      const key = `${config.redis.keyPrefix}session:${userId}`;
      await this.client.del(key);
    } catch (error) {
      logger.error('Failed to remove user session:', error);
    }
  }

  // Pub/Sub Methods
  async publishPresenceUpdate(userId, status, serviceId) {
    try {
      const channel = `${config.redis.keyPrefix}presence_updates`;
      const message = JSON.stringify({
        userId,
        status,
        serviceId,
        timestamp: Date.now()
      });

      await this.publisher.publish(channel, message);
    } catch (error) {
      logger.error('Failed to publish presence update:', error);
    }
  }

  async subscribeToPresenceUpdates(callback) {
    try {
      const channel = `${config.redis.keyPrefix}presence_updates`;
      
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          logger.error('Error processing presence update:', error);
        }
      });

      logger.info('Subscribed to presence updates');
    } catch (error) {
      logger.error('Failed to subscribe to presence updates:', error);
      throw error;
    }
  }

  async publishMessage(channel, message) {
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          logger.error('Error processing subscription message:', error);
        }
      });
    } catch (error) {
      logger.error('Failed to subscribe to channel:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) await this.client.disconnect();
      if (this.subscriber) await this.subscriber.disconnect();
      if (this.publisher) await this.publisher.disconnect();
      
      this.isConnected = false;
      logger.info('Redis clients disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis clients:', error);
      throw error;
    }
  }
}

module.exports = new RedisClient(); 