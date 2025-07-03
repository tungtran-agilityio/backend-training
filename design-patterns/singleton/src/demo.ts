import { DatabaseSingleton } from './database-singleton'
import * as path from 'path'

async function simpleDemo(): Promise<void> {
  console.log('🚀 Simple Database Singleton Demo\n')

  try {
    // Get singleton instance
    const dbPath = path.join(__dirname, '../simple-demo.db')
    const db = DatabaseSingleton.getInstance(dbPath)

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 100))

    console.log('Database connected:', db.isConnected())

    // Verify singleton behavior
    const db2 = DatabaseSingleton.getInstance()
    console.log('Same instance?', db === db2)

    // Create a simple table
    console.log('\n📋 Creating table...')
    await db.execute(`
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				email TEXT UNIQUE NOT NULL
			)
		`)

    // Insert some data
    console.log('\n📝 Inserting data...')
    const insertResult1 = await db.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      ['John Doe', 'john@example.com']
    )
    console.log('Insert result:', insertResult1)

    const insertResult2 = await db.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      ['Jane Smith', 'jane@example.com']
    )
    console.log('Insert result:', insertResult2)

    // Query data
    console.log('\n📖 Querying data...')
    const selectResult = await db.query('SELECT * FROM users')
    console.log('All users:', selectResult.rows)

    // Query with parameters
    const userResult = await db.query(
      'SELECT * FROM users WHERE name LIKE ?',
      ['%John%']
    )
    console.log('Users with "John":', userResult.rows)

    // Update data
    console.log('\n✏️ Updating data...')
    const updateResult = await db.query(
      'UPDATE users SET email = ? WHERE name = ?',
      ['john.doe@example.com', 'John Doe']
    )
    console.log('Update result:', updateResult)

    // Verify update
    const updatedUser = await db.query(
      'SELECT * FROM users WHERE name = ?',
      ['John Doe']
    )
    console.log('Updated user:', updatedUser.rows)

    // Count records
    const countResult = await db.query('SELECT COUNT(*) as total FROM users')
    console.log('Total users:', countResult.rows)

    // Delete a record
    console.log('\n🗑️ Deleting data...')
    const deleteResult = await db.query(
      'DELETE FROM users WHERE email = ?',
      ['jane@example.com']
    )
    console.log('Delete result:', deleteResult)

    // Final state
    const finalResult = await db.query('SELECT * FROM users')
    console.log('Remaining users:', finalResult.rows)

    console.log('\n✅ Demo completed successfully!')

  } catch (error) {
    console.error('❌ Demo failed:', error)
  }
}

// Run the demo
if (require.main === module) {
  simpleDemo().catch(console.error)
} 