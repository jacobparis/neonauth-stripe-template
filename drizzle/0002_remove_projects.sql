-- Drop project_id foreign key constraint
ALTER TABLE todos DROP COLUMN project_id;

-- Drop projects table
DROP TABLE projects; 
