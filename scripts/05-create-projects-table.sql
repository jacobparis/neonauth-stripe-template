-- Check if the projects table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
        -- Create projects table if it doesn't exist
        CREATE TABLE projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(255) NOT NULL DEFAULT '#4f46e5',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            owner_id VARCHAR(255)
        );
    END IF;
END $$;
