-- Insert a default project for new users
INSERT INTO projects (name, color)
VALUES ('Personal', '#4f46e5')
ON CONFLICT DO NOTHING;

-- Insert a work project
INSERT INTO projects (name, color)
VALUES ('Work', '#ef4444')
ON CONFLICT DO NOTHING;
