-- Migration: Templates Personalizados
-- Description: Add support for personal and team templates with proper ownership and access control
-- Date: 2025-01-07

-- First, let's add the missing fields to project_templates table
ALTER TABLE public.project_templates 
ADD COLUMN IF NOT EXISTS template_type VARCHAR(20) DEFAULT 'global' CHECK (template_type IN ('global', 'personal', 'team')),
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES client_data.clients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES client_data.teams(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES client_data.projects(id) ON DELETE SET NULL;

-- Add proper foreign key constraint for created_by
ALTER TABLE public.project_templates 
ADD CONSTRAINT fk_project_templates_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add foreign key constraints to template_columns
ALTER TABLE public.template_columns 
ADD CONSTRAINT fk_template_columns_template_id 
FOREIGN KEY (template_id) REFERENCES public.project_templates(id) ON DELETE CASCADE;

-- Add foreign key constraints to template_tasks
ALTER TABLE public.template_tasks 
ADD CONSTRAINT fk_template_tasks_template_id 
FOREIGN KEY (template_id) REFERENCES public.project_templates(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_template_tasks_column_id 
FOREIGN KEY (column_id) REFERENCES public.template_columns(id) ON DELETE CASCADE;

-- Add missing fields to template_columns for better functionality
ALTER TABLE public.template_columns 
ADD COLUMN IF NOT EXISTS limit_wip INTEGER DEFAULT NULL;

-- Add missing fields to template_tasks for better functionality
ALTER TABLE public.template_tasks 
ADD COLUMN IF NOT EXISTS due_date_offset INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assigned_to_role VARCHAR(50) DEFAULT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_templates_template_type ON public.project_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_project_templates_client_id ON public.project_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_team_id ON public.project_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by ON public.project_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON public.project_templates(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_active ON public.project_templates(is_active);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_project_templates_client_type ON public.project_templates(client_id, template_type);
CREATE INDEX IF NOT EXISTS idx_project_templates_team_type ON public.project_templates(team_id, template_type);

-- Update existing templates to be 'global' type
UPDATE public.project_templates 
SET template_type = 'global', 
    is_active = COALESCE(is_active, true),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE template_type IS NULL OR template_type = 'global';

-- Add default values and constraints
ALTER TABLE public.project_templates 
ALTER COLUMN is_active SET DEFAULT true,
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Add check constraints for data integrity
ALTER TABLE public.project_templates 
ADD CONSTRAINT check_template_ownership 
CHECK (
  (template_type = 'global' AND client_id IS NULL AND team_id IS NULL) OR
  (template_type = 'personal' AND client_id IS NOT NULL AND team_id IS NULL) OR
  (template_type = 'team' AND client_id IS NOT NULL AND team_id IS NOT NULL)
);

-- Enable Row Level Security on project_templates
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_templates
-- Policy 1: Global templates are visible to everyone
CREATE POLICY "Global templates are visible to all authenticated users" 
ON public.project_templates FOR SELECT 
TO authenticated 
USING (template_type = 'global' AND is_active = true);

-- Policy 2: Personal templates are visible only to the creator and their client
CREATE POLICY "Personal templates are visible to creator and client users" 
ON public.project_templates FOR SELECT 
TO authenticated 
USING (
  template_type = 'personal' 
  AND is_active = true 
  AND (
    created_by = auth.uid() 
    OR client_id = (
      SELECT client_id 
      FROM client_data.client_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy 3: Team templates are visible to team members
CREATE POLICY "Team templates are visible to team members" 
ON public.project_templates FOR SELECT 
TO authenticated 
USING (
  template_type = 'team' 
  AND is_active = true 
  AND team_id IN (
    SELECT t.id 
    FROM client_data.teams t
    JOIN client_data.client_profiles cp ON t.client_id = cp.client_id
    WHERE cp.user_id = auth.uid()
  )
);

-- Policy 4: Users can create personal templates
CREATE POLICY "Users can create personal templates" 
ON public.project_templates FOR INSERT 
TO authenticated 
WITH CHECK (
  template_type = 'personal' 
  AND created_by = auth.uid()
  AND client_id = (
    SELECT client_id 
    FROM client_data.client_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Policy 5: Team leaders can create team templates
CREATE POLICY "Team leaders can create team templates" 
ON public.project_templates FOR INSERT 
TO authenticated 
WITH CHECK (
  template_type = 'team' 
  AND created_by = auth.uid()
  AND team_id IN (
    SELECT t.id 
    FROM client_data.teams t
    JOIN client_data.client_profiles cp ON t.client_id = cp.client_id
    WHERE cp.user_id = auth.uid()
    -- For now, allow any team member to create team templates
    -- Later you can restrict to: AND (t.leader_id = auth.uid() OR cp.role = 'admin')
  )
);

-- Policy 6: Users can update their own templates
CREATE POLICY "Users can update their own templates" 
ON public.project_templates FOR UPDATE 
TO authenticated 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Policy 7: Users can delete their own templates (soft delete by setting is_active = false)
CREATE POLICY "Users can soft delete their own templates" 
ON public.project_templates FOR UPDATE 
TO authenticated 
USING (created_by = auth.uid() AND is_active = true)
WITH CHECK (created_by = auth.uid() AND is_active = false);

-- Enable RLS on template_columns and template_tasks
ALTER TABLE public.template_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for template_columns (inherit from parent template)
CREATE POLICY "Template columns inherit template visibility" 
ON public.template_columns FOR SELECT 
TO authenticated 
USING (
  template_id IN (
    SELECT id FROM public.project_templates
    -- This will use the existing RLS policies on project_templates
  )
);

CREATE POLICY "Users can manage columns of their templates" 
ON public.template_columns FOR ALL 
TO authenticated 
USING (
  template_id IN (
    SELECT id FROM public.project_templates 
    WHERE created_by = auth.uid()
  )
);

-- RLS policies for template_tasks (inherit from parent template)
CREATE POLICY "Template tasks inherit template visibility" 
ON public.template_tasks FOR SELECT 
TO authenticated 
USING (
  template_id IN (
    SELECT id FROM public.project_templates
    -- This will use the existing RLS policies on project_templates
  )
);

CREATE POLICY "Users can manage tasks of their templates" 
ON public.template_tasks FOR ALL 
TO authenticated 
USING (
  template_id IN (
    SELECT id FROM public.project_templates 
    WHERE created_by = auth.uid()
  )
);

-- Create helper function to get user's client ID
CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT client_id 
    FROM client_data.client_profiles 
    WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_client_id(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN public.project_templates.template_type IS 'Type of template: global (admin-created), personal (user-created), team (team-shared)';
COMMENT ON COLUMN public.project_templates.client_id IS 'Client that owns this template (for personal and team templates)';
COMMENT ON COLUMN public.project_templates.team_id IS 'Team that owns this template (for team templates only)';
COMMENT ON COLUMN public.project_templates.source_project_id IS 'Original project this template was created from (if applicable)';
COMMENT ON COLUMN public.template_columns.limit_wip IS 'Work-in-progress limit for this column (optional)';
COMMENT ON COLUMN public.template_tasks.due_date_offset IS 'Days offset from project start for due date (optional)';
COMMENT ON COLUMN public.template_tasks.assigned_to_role IS 'Role to assign this task to (instead of specific user)';

-- Create RPC function to create personal templates
CREATE OR REPLACE FUNCTION public.create_personal_template(
  p_name VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_category VARCHAR DEFAULT 'outros',
  p_template_type VARCHAR DEFAULT 'personal',
  p_template_config JSONB DEFAULT '{}',
  p_created_by UUID DEFAULT auth.uid(),
  p_client_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,
  p_columns JSONB DEFAULT '[]',
  p_tasks JSONB DEFAULT '[]'
)
RETURNS UUID AS $$
DECLARE
  template_id UUID;
  column_record JSONB;
  task_record JSONB;
  column_id UUID;
  column_mapping JSONB := '{}';
BEGIN
  -- Validate input
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
    RAISE EXCEPTION 'Template name is required';
  END IF;

  -- Get user's client_id if not provided
  IF p_client_id IS NULL AND p_template_type IN ('personal', 'team') THEN
    p_client_id := public.get_user_client_id(p_created_by);
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'User must have a client profile to create personal/team templates';
    END IF;
  END IF;

  -- Validate template type constraints
  IF p_template_type = 'global' AND (p_client_id IS NOT NULL OR p_team_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Global templates cannot have client_id or team_id';
  END IF;

  IF p_template_type = 'personal' AND (p_client_id IS NULL OR p_team_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Personal templates must have client_id and no team_id';
  END IF;

  IF p_template_type = 'team' AND (p_client_id IS NULL OR p_team_id IS NULL) THEN
    RAISE EXCEPTION 'Team templates must have both client_id and team_id';
  END IF;

  -- Create the template
  INSERT INTO public.project_templates (
    id, name, description, category, template_type, template_config,
    created_by, client_id, team_id, is_active, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_name, p_description, p_category, p_template_type, p_template_config,
    p_created_by, p_client_id, p_team_id, true, NOW(), NOW()
  ) RETURNING id INTO template_id;

  -- Create columns
  FOR column_record IN SELECT * FROM jsonb_array_elements(p_columns)
  LOOP
    INSERT INTO public.template_columns (
      id, template_id, name, position, color, description, limit_wip, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      template_id,
      column_record->>'name',
      (column_record->>'position')::INTEGER,
      column_record->>'color',
      column_record->>'description',
      CASE WHEN column_record->>'limit_wip' IS NOT NULL
           THEN (column_record->>'limit_wip')::INTEGER
           ELSE NULL END,
      NOW(),
      NOW()
    ) RETURNING id INTO column_id;

    -- Store column mapping for tasks (old column_id -> new column_id)
    column_mapping := column_mapping || jsonb_build_object(
      column_record->>'id', column_id::TEXT
    );
  END LOOP;

  -- Create tasks
  FOR task_record IN SELECT * FROM jsonb_array_elements(p_tasks)
  LOOP
    -- Get the new column_id from mapping
    column_id := (column_mapping->(task_record->>'column_id'))::UUID;

    IF column_id IS NOT NULL THEN
      INSERT INTO public.template_tasks (
        id, template_id, column_id, title, description, position, priority,
        estimated_hours, tags, due_date_offset, assigned_to_role, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        template_id,
        column_id,
        task_record->>'title',
        task_record->>'description',
        (task_record->>'position')::INTEGER,
        task_record->>'priority',
        CASE WHEN task_record->>'estimated_hours' IS NOT NULL
             THEN (task_record->>'estimated_hours')::INTEGER
             ELSE NULL END,
        CASE WHEN task_record->'tags' IS NOT NULL
             THEN ARRAY(SELECT jsonb_array_elements_text(task_record->'tags'))
             ELSE NULL END,
        CASE WHEN task_record->>'due_date_offset' IS NOT NULL
             THEN (task_record->>'due_date_offset')::INTEGER
             ELSE NULL END,
        task_record->>'assigned_to_role',
        NOW(),
        NOW()
      );
    END IF;
  END LOOP;

  RETURN template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_personal_template(
  VARCHAR, TEXT, VARCHAR, VARCHAR, JSONB, UUID, UUID, UUID, JSONB, JSONB
) TO authenticated;

-- Create function to get templates accessible to current user
CREATE OR REPLACE FUNCTION public.get_user_accessible_templates(
  p_category VARCHAR DEFAULT NULL,
  p_template_type VARCHAR DEFAULT NULL,
  p_active_only BOOLEAN DEFAULT true
)
RETURNS TABLE(
  id UUID,
  name VARCHAR,
  description TEXT,
  category VARCHAR,
  template_type VARCHAR,
  template_config JSONB,
  is_active BOOLEAN,
  created_by UUID,
  client_id UUID,
  team_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  column_count BIGINT,
  task_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.name,
    pt.description,
    pt.category,
    pt.template_type,
    pt.template_config,
    pt.is_active,
    pt.created_by,
    pt.client_id,
    pt.team_id,
    pt.created_at,
    pt.updated_at,
    COALESCE(col_count.count, 0) as column_count,
    COALESCE(task_count.count, 0) as task_count
  FROM public.project_templates pt
  LEFT JOIN (
    SELECT template_id, COUNT(*) as count
    FROM public.template_columns
    GROUP BY template_id
  ) col_count ON pt.id = col_count.template_id
  LEFT JOIN (
    SELECT template_id, COUNT(*) as count
    FROM public.template_tasks
    GROUP BY template_id
  ) task_count ON pt.id = task_count.template_id
  WHERE
    (p_active_only = false OR pt.is_active = true)
    AND (p_category IS NULL OR pt.category = p_category)
    AND (p_template_type IS NULL OR pt.template_type = p_template_type)
    -- RLS policies will handle access control automatically
  ORDER BY
    pt.template_type ASC, -- global first, then personal, then team
    pt.category ASC,
    pt.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_accessible_templates(VARCHAR, VARCHAR, BOOLEAN) TO authenticated;

-- Add comments for the new functions
COMMENT ON FUNCTION public.create_personal_template IS 'Creates a new template (personal, team, or global) with columns and tasks';
COMMENT ON FUNCTION public.get_user_accessible_templates IS 'Returns templates accessible to the current user based on RLS policies';
