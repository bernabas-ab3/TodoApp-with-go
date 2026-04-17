ALTER TABLE todos ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_todos_user'
          AND table_name = 'todos'
    ) THEN
        ALTER TABLE todos
        ADD CONSTRAINT fk_todos_user
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;
