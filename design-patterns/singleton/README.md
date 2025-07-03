# SQLite Database Singleton Pattern

This project demonstrates the implementation of the Singleton design pattern for SQLite database connections in TypeScript using the `better-sqlite3` library.

## 🎯 What is the Singleton Pattern?

The Singleton pattern ensures that a class has only one instance and provides a global point of access to that instance. This is particularly useful for database connections where you want to:

- Avoid multiple database connections
- Share the same connection across your application
- Ensure consistent database state
- Optimize resource usage

## 🏗️ Key Features

- **Single Instance**: Only one database connection throughout the application lifecycle
- **Thread-Safe**: Proper initialization handling
- **Type-Safe**: Full TypeScript support with proper typing
- **CRUD Operations**: Built-in methods for common database operations
- **Transaction Support**: Safe transaction handling
- **Error Handling**: Comprehensive error management
- **Performance Optimized**: WAL mode and optimized SQLite settings

## 📁 Project Structure

```
singleton/
├── src/
│   ├── database-singleton.ts  # Main singleton implementation
│   ├── demo.ts               # Usage demonstration
│   └── index.ts              # Public exports
├── package.json              # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## 🚀 Quick Start

### Installation

```bash
cd design-patterns/singleton
npm install
```

### Run the Demo

```bash
# Development mode (with ts-node)
npm run dev

# Build and run
npm run build
npm start
```

## 💻 Usage Examples

### Basic Usage

```typescript
import { DatabaseSingleton } from './database-singleton'

// Get the singleton instance
const db = DatabaseSingleton.getInstance('./myapp.db')

// Use the database
const users = db.getAllUsers()
console.log(users)
```

### With Configuration

```typescript
import { DatabaseSingleton } from './database-singleton'

const db = DatabaseSingleton.getInstance('./myapp.db', {
	readonly: false,
	timeout: 10000,
	verbose: console.log
})
```

### CRUD Operations

```typescript
const db = DatabaseSingleton.getInstance()

// Create
const userId = db.createUser('John Doe', 'john@example.com')

// Read
const user = db.getUserById(userId)
const allUsers = db.getAllUsers()

// Update
db.updateUser(userId, 'John Updated', 'john.new@example.com')

// Delete
db.deleteUser(userId)
```

### Custom Queries

```typescript
const db = DatabaseSingleton.getInstance()

// SELECT query
const results = db.executeQuery('SELECT * FROM users WHERE email LIKE ?', ['%@example.com'])

// INSERT/UPDATE/DELETE
const result = db.executeStatement('INSERT INTO users (name, email) VALUES (?, ?)', ['Jane', 'jane@example.com'])
```

### Transactions

```typescript
const db = DatabaseSingleton.getInstance()

const result = db.transaction(() => {
	const userId = db.createUser('Transaction User', 'trans@example.com')
	db.executeStatement('INSERT INTO posts (user_id, title) VALUES (?, ?)', [userId, 'My Post'])
	return userId
})
```

## 🏛️ Architecture Benefits

### 1. Resource Management
- Single database connection reduces overhead
- Automatic connection pooling not needed
- Consistent connection state

### 2. Data Consistency
- All parts of the application use the same database instance
- No connection synchronization issues
- Shared transaction state

### 3. Performance
- No connection establishment overhead
- Optimized SQLite settings (WAL mode, caching)
- Prepared statements for better performance

### 4. Error Handling
- Centralized error management
- Connection state monitoring
- Graceful failure handling

## 🔧 Configuration Options

The `DatabaseConfig` interface provides the following options:

```typescript
interface DatabaseConfig {
	readonly: boolean        // Open database in readonly mode
	fileMustExist: boolean  // Database file must exist
	timeout: number         // Connection timeout in milliseconds
	verbose?: Function      // Logging function for debugging
}
```

## ⚠️ Important Considerations

### When to Use Singleton for Database

✅ **Good Use Cases:**
- Single-threaded applications (Node.js)
- Applications with simple database needs
- Desktop applications
- CLI tools and scripts

❌ **Avoid When:**
- Building web servers with high concurrency
- Need connection pooling
- Multiple database connections required
- Microservices architecture

### Alternatives to Consider

For production web applications, consider:
- **Connection Pooling**: Libraries like `pg-pool` for PostgreSQL
- **ORM Solutions**: Prisma, TypeORM, Sequelize
- **Database Clients**: With built-in connection management

## 🧪 Testing

The demo file (`demo.ts`) includes comprehensive tests:

- Singleton instance verification
- CRUD operations testing
- Transaction handling
- Error scenarios
- Cross-context singleton behavior

## 🛠️ Development

### Build

```bash
npm run build
```

### Type Checking

```bash
npx tsc --noEmit
```

### Adding New Features

1. Extend the `DatabaseSingleton` class in `database-singleton.ts`
2. Add corresponding tests in `demo.ts`
3. Update the exports in `index.ts`
4. Document new features in this README

## 📚 Further Reading

- [Singleton Pattern - Gang of Four](https://en.wikipedia.org/wiki/Singleton_pattern)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [SQLite WAL Mode](https://www.sqlite.org/wal.html)
- [TypeScript Design Patterns](https://refactoring.guru/design-patterns/typescript)

## 🤝 Contributing

Feel free to extend this implementation with additional features like:
- Connection health checks
- Automatic reconnection
- Query logging and metrics
- Database schema migrations
- Backup and restore functionality 