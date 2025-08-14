-- Add policy to allow service role to insert new users during signup
CREATE POLICY users_insert_service_role ON users
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Add policy to allow authenticated users to insert their own data
CREATE POLICY users_insert_own ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);
