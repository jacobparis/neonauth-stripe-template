-- Check if the user_metrics table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_metrics') THEN
        -- Create user_metrics table if it doesn't exist
        CREATE TABLE user_metrics (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) UNIQUE,
            todos_created INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;
