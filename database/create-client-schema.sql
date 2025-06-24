-- Create client_data schema and tables
-- This script creates the necessary database structure for client management

-- 1. Create client_data schema
CREATE SCHEMA IF NOT EXISTS client_data;

-- 2. Create clients table
CREATE TABLE IF NOT EXISTS client_data.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'business')),
  max_users INTEGER NOT NULL DEFAULT 5,
  max_projects INTEGER NOT NULL DEFAULT 3,
  stripe_customer_id TEXT,
  cnpj TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create client_profiles table
CREATE TABLE IF NOT EXISTS client_data.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES client_data.clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  google_account_connected BOOLEAN DEFAULT FALSE,
  google_refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

-- 4. Enable RLS on client tables
ALTER TABLE client_data.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data.client_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for clients table
-- Platform admins can manage all clients
CREATE POLICY "Platform admins can view all clients" ON client_data.clients
  FOR SELECT USING (auth.email() LIKE '%@focusprint.com');

CREATE POLICY "Platform admins can insert clients" ON client_data.clients
  FOR INSERT WITH CHECK (auth.email() LIKE '%@focusprint.com');

CREATE POLICY "Platform admins can update clients" ON client_data.clients
  FOR UPDATE USING (auth.email() LIKE '%@focusprint.com');

CREATE POLICY "Platform admins can delete clients" ON client_data.clients
  FOR DELETE USING (auth.email() LIKE '%@focusprint.com');

-- 6. Create RLS policies for client_profiles table
-- Platform admins can manage all client profiles
CREATE POLICY "Platform admins can view all client profiles" ON client_data.client_profiles
  FOR SELECT USING (auth.email() LIKE '%@focusprint.com');

CREATE POLICY "Platform admins can insert client profiles" ON client_data.client_profiles
  FOR INSERT WITH CHECK (auth.email() LIKE '%@focusprint.com');

CREATE POLICY "Platform admins can update client profiles" ON client_data.client_profiles
  FOR UPDATE USING (auth.email() LIKE '%@focusprint.com');

CREATE POLICY "Platform admins can delete client profiles" ON client_data.client_profiles
  FOR DELETE USING (auth.email() LIKE '%@focusprint.com');

-- Users can view their own client profiles
CREATE POLICY "Users can view own client profiles" ON client_data.client_profiles
  FOR SELECT USING (user_id = auth.uid());

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON client_data.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON client_data.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_plan_type ON client_data.clients(plan_type);
CREATE INDEX IF NOT EXISTS idx_client_profiles_user_id ON client_data.client_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_client_id ON client_data.client_profiles(client_id);

-- 8. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON client_data.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON client_data.client_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
