import { TestDatabaseSetup } from './test-database.setup';

declare global {
  var __TEST_DATABASE_URL__: string;
}

export default async (): Promise<void> => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PASSWORD_PEPPER = 'test-pepper-secret';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.HASH_MEMORY_COST = '1024';
  process.env.HASH_TIME_COST = '1';
  process.env.HASH_PARALLELISM = '1';

  // Setup test database
  const databaseUrl = await TestDatabaseSetup.setupDatabase();
  console.log(`Test database setup complete: ${databaseUrl}`);

  // Store database URL in global variable for tests
  global.__TEST_DATABASE_URL__ = databaseUrl;
};
