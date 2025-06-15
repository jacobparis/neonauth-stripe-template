import { neon } from "@neondatabase/serverless"

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!)
  
  try {
    console.log('Adding deleted_at column to todos table...')
    
    // Check if column already exists
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'todos' AND column_name = 'deleted_at'
    `
    
    if (result.length > 0) {
      console.log('Column deleted_at already exists in todos table')
      return
    }
    
    // Add the column
    await sql`ALTER TABLE "todos" ADD COLUMN "deleted_at" timestamp`
    
    console.log('✅ Successfully added deleted_at column to todos table')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration() 
