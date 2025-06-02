-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4f46e5',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  owner_id TEXT,
  FOREIGN KEY (owner_id) REFERENCES neon_auth.users_sync(id)
);

-- Create user_metrics table
CREATE TABLE IF NOT EXISTS user_metrics (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  todos_created INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (user_id) REFERENCES neon_auth.users_sync(id)
);

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create users_sync table
CREATE TABLE IF NOT EXISTS users_sync (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    name VARCHAR(255),
    image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    todo_id INTEGER NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create issues table if it doesn't exist
CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  issue_number SERIAL NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id VARCHAR(255) NOT NULL
);
