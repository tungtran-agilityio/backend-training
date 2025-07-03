import * as sqlite3 from 'sqlite3'

export interface QueryResult {
  lastID?: number
  changes?: number
  rows?: any[]
}

/**
 * Simple Database Singleton for SQLite
 * Provides a single instance to run queries on the database
 */
export class DatabaseSingleton {
  private static instance: DatabaseSingleton
  private db: sqlite3.Database
  private isReady: boolean = false

  private constructor(dbPath: string = ':memory:') {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message)
        throw err
      } else {
        console.log(`✅ Connected to SQLite database: ${dbPath}`)
        this.isReady = true
      }
    })
  }

  public static getInstance(dbPath?: string): DatabaseSingleton {
    if (!DatabaseSingleton.instance) {
      DatabaseSingleton.instance = new DatabaseSingleton(dbPath)
    }
    return DatabaseSingleton.instance
  }

  public async query(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.isReady) {
      throw new Error('Database not ready')
    }

    return new Promise((resolve, reject) => {
      const trimmedSql = sql.trim().toUpperCase()

      if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('WITH')) {
        // For SELECT queries, return rows
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(new Error(`Query failed: ${err.message}`))
          } else {
            resolve({ rows: rows || [] })
          }
        })
      } else {
        // For INSERT, UPDATE, DELETE queries, return metadata
        this.db.run(sql, params, function (err) {
          if (err) {
            reject(new Error(`Query failed: ${err.message}`))
          } else {
            resolve({
              lastID: this.lastID,
              changes: this.changes
            })
          }
        })
      }
    })
  }

  public async execute(sql: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('Database not ready')
    }

    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) {
          reject(new Error(`Execution failed: ${err.message}`))
        } else {
          resolve()
        }
      })
    })
  }

  public isConnected(): boolean {
    return this.isReady
  }

  public close(): void {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message)
        } else {
          console.log('📛 Database connection closed')
          this.isReady = false
        }
      })
    }
  }
} 