import { TestDatabaseSetup } from './test-database.setup';

export default async (): Promise<void> => {
  // Teardown test database
  await TestDatabaseSetup.teardownDatabase();
  console.log('Test database teardown complete');
};
