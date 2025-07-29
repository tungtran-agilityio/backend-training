import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { PrismaClient } from '../generated/prisma';
import { execSync } from 'child_process';

export class TestDatabaseSetup {
  private static container: StartedMySqlContainer;
  private static prisma: PrismaClient;

  static async setupDatabase(): Promise<string> {
    console.log('Setting up test database...');

    // Start MySQL container
    this.container = await new MySqlContainer('mysql:8.0')
      .withDatabase('test_social_app')
      .withUsername('test_user')
      .withUserPassword('test_password')
      .withRootPassword('root_password')
      .start();

    const databaseUrl = this.container.getConnectionUri();
    console.log(`Database URL: ${databaseUrl}`);

    // Set environment variable for Prisma
    process.env.DATABASE_URL = databaseUrl;

    // Run Prisma migrations
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    // Initialize Prisma client
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    await this.prisma.$connect();
    console.log('Prisma client connected successfully');

    return databaseUrl;
  }

  static async cleanDatabase(): Promise<void> {
    if (this.prisma) {
      // Clean all tables in reverse order to respect foreign key constraints
      await this.prisma.comment.deleteMany();
      await this.prisma.post.deleteMany();
      await this.prisma.user.deleteMany();
    }
  }

  static async teardownDatabase(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    if (this.container) {
      await this.container.stop();
    }
  }

  static getPrismaClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error(
        'Prisma client is not initialized. Make sure setupDatabase() was called first.',
      );
    }
    return this.prisma;
  }

  static getDatabaseUrl(): string {
    return this.container?.getConnectionUri() || '';
  }

  static async ensureReady(): Promise<PrismaClient> {
    // Wait for the client to be available (with timeout)
    const maxWait = 30000; // 30 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (!this.prisma && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (!this.prisma) {
      throw new Error('Prisma client is not ready after 30 seconds');
    }

    return this.prisma;
  }
}
