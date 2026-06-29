import { LibSQLStore, LibSQLVector } from '@mastra/libsql'
import { PostgresStore, PgVector } from '@mastra/pg'

const dbUrl = process.env.SUPABASE_DATABASE_URL

export const storage = dbUrl
  ? new PostgresStore({ id: 'allein-storage', connectionString: dbUrl })
  : new LibSQLStore({ id: 'allein-storage', url: 'file:./mastra.db' })

export const vectorStore = dbUrl
  ? new PgVector({ id: 'allein-vector', connectionString: dbUrl })
  : new LibSQLVector({ id: 'allein-vector', url: 'file:./mastra.db' })
