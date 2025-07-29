import { TestDatabaseSetup } from './test-database.setup';

beforeEach(async () => {
  // Clean database before each test
  await TestDatabaseSetup.cleanDatabase();
});
