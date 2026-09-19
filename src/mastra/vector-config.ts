const dbUrl = process.env.SUPABASE_DATABASE_URL

// Kept separate from storage so the Studio agent (which has no semantic
// recall) never constructs or retains a vector provider.
export const vectorStore = dbUrl
  ? new (await import('@mastra/pg')).PgVector({
      id: 'allein-vector',
      connectionString: dbUrl,
    })
  : new (await import('@mastra/libsql')).LibSQLVector({
      id: 'allein-vector',
      url: 'file:./mastra.db',
    })
