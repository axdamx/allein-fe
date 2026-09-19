const dbUrl = process.env.SUPABASE_DATABASE_URL

export const storage = dbUrl
  ? new (await import('@mastra/pg')).PostgresStore({
      id: 'allein-storage',
      connectionString: dbUrl,
    })
  : new (await import('@mastra/libsql')).LibSQLStore({
      id: 'allein-storage',
      url: 'file:./mastra.db',
    })
