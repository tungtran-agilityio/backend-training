const { Kafka } = require('kafkajs');
const config = require('../config');
const logger = require('../utils/logger');

class KafkaClient {
  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = null;
    this.consumer = null;
    this.adminClient = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      this.producer = this.kafka.producer();
      this.adminClient = this.kafka.admin();

      // Create topics if they don't exist
      await this.createTopics();
      
      // Connect producer
      await this.producer.connect();
      
      this.isConnected = true;
      logger.info('Kafka client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka client:', error);
      throw error;
    }
  }

  async createTopics() {
    try {
      await this.adminClient.connect();
      
      const topics = Object.values(config.kafka.topics).map(topic => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1
      }));

      await this.adminClient.createTopics({
        topics,
        waitForLeaders: true
      });

      await this.adminClient.disconnect();
      logger.info('Kafka topics created successfully');
    } catch (error) {
      if (error.type === 'TOPIC_ALREADY_EXISTS') {
        logger.info('Kafka topics already exist');
      } else {
        logger.error('Failed to create Kafka topics:', error);
        throw error;
      }
    }
  }

  async createConsumer(groupId, topics) {
    try {
      const consumer = this.kafka.consumer({ 
        groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000
      });
      
      await consumer.connect();
      await consumer.subscribe({ 
        topics: Array.isArray(topics) ? topics : [topics],
        fromBeginning: false
      });
      
      logger.info(`Consumer created for group: ${groupId}, topics: ${topics}`);
      return consumer;
    } catch (error) {
      logger.error('Failed to create Kafka consumer:', error);
      throw error;
    }
  }

  async publishMessage(topic, message, key = null) {
    if (!this.isConnected) {
      throw new Error('Kafka client is not connected');
    }

    try {
      const result = await this.producer.send({
        topic,
        messages: [{
          key,
          value: JSON.stringify(message),
          timestamp: Date.now().toString()
        }]
      });

      logger.debug(`Message published to topic ${topic}:`, result);
      return result;
    } catch (error) {
      logger.error(`Failed to publish message to topic ${topic}:`, error);
      throw error;
    }
  }

  async publishChatMessage(message) {
    const key = message.conversationId;
    return this.publishMessage(config.kafka.topics.messages, message, key);
  }

  async publishPresenceUpdate(presenceData) {
    const key = presenceData.userId;
    return this.publishMessage(config.kafka.topics.presence, presenceData, key);
  }

  async publishNotification(notification) {
    const key = notification.userId;
    return this.publishMessage(config.kafka.topics.notifications, notification, key);
  }

  async startMessageConsumer(messageHandler) {
    try {
      const consumer = await this.createConsumer(
        `chat-service-${config.serviceId}`,
        [config.kafka.topics.messages]
      );

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const messageData = JSON.parse(message.value.toString());
            await messageHandler(messageData, {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString()
            });
          } catch (error) {
            logger.error('Error processing message:', error);
          }
        }
      });

      logger.info('Message consumer started');
      return consumer;
    } catch (error) {
      logger.error('Failed to start message consumer:', error);
      throw error;
    }
  }

  async startPresenceConsumer(presenceHandler) {
    try {
      const consumer = await this.createConsumer(
        `presence-service-${config.serviceId}`,
        [config.kafka.topics.presence]
      );

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const presenceData = JSON.parse(message.value.toString());
            await presenceHandler(presenceData, {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString()
            });
          } catch (error) {
            logger.error('Error processing presence update:', error);
          }
        }
      });

      logger.info('Presence consumer started');
      return consumer;
    } catch (error) {
      logger.error('Failed to start presence consumer:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      if (this.adminClient) {
        await this.adminClient.disconnect();
      }
      
      this.isConnected = false;
      logger.info('Kafka client disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka client:', error);
      throw error;
    }
  }
}

module.exports = new KafkaClient(); 