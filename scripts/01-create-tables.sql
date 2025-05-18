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
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  project_id INTEGER REFERENCES projects(id),
  user_id TEXT REFERENCES neon_auth.users_sync(id),
  owner_id TEXT,
  FOREIGN KEY (owner_id) REFERENCES neon_auth.users_sync(id)
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
