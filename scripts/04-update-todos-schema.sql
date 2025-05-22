-- Check if the todos table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'todos') THEN
        -- Check if the text column exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'todos' AND column_name = 'text') THEN
            -- Rename text column to title
            ALTER TABLE todos RENAME COLUMN text TO title;
        ELSIF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'todos' AND column_name = 'title') THEN
            -- Add title column if neither text nor title exists
            ALTER TABLE todos ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '';
        END IF;
    ELSE
        -- Create todos table if it doesn't exist
        CREATE TABLE todos (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT false,
            due_date TIMESTAMP,
            project_id INTEGER,
            owner_id VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;
