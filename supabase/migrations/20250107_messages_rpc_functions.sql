-- Migration: Messages RPC Functions
-- Description: Create RPC functions for message operations and enable Realtime
-- Date: 2025-01-07

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE client_data.messages;

-- Function to create a new message
CREATE OR REPLACE FUNCTION client_data.create_message(
  p_project_id UUID,
  p_user_id UUID,
  p_content TEXT,
  p_message_type VARCHAR DEFAULT 'text',
  p_meet_link TEXT DEFAULT NULL,
  p_referenced_task_id UUID DEFAULT NULL,
  p_thread_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  user_id UUID,
  content TEXT,
  message_type VARCHAR,
  meet_link TEXT,
  referenced_task_id UUID,
  thread_id UUID,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  tasks JSONB
) AS $$
DECLARE
  new_message_id UUID;
BEGIN
  -- Insert the new message
  INSERT INTO client_data.messages (
    project_id,
    user_id,
    content,
    message_type,
    meet_link,
    referenced_task_id,
    thread_id
  ) VALUES (
    p_project_id,
    p_user_id,
    p_content,
    p_message_type,
    p_meet_link,
    p_referenced_task_id,
    p_thread_id
  ) RETURNING client_data.messages.id INTO new_message_id;

  -- Return the created message with task details if referenced
  RETURN QUERY
  SELECT 
    m.id,
    m.project_id,
    m.user_id,
    m.content,
    m.message_type,
    m.meet_link,
    m.referenced_task_id,
    m.thread_id,
    m.is_edited,
    m.created_at,
    m.updated_at,
    CASE 
      WHEN m.referenced_task_id IS NOT NULL THEN
        jsonb_build_object(
          'id', t.id,
          'title', t.title
        )
      ELSE NULL
    END as tasks
  FROM client_data.messages m
  LEFT JOIN client_data.tasks t ON m.referenced_task_id = t.id
  WHERE m.id = new_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get project messages
CREATE OR REPLACE FUNCTION client_data.get_project_messages(
  p_project_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  user_id UUID,
  content TEXT,
  message_type VARCHAR,
  meet_link TEXT,
  referenced_task_id UUID,
  thread_id UUID,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  tasks JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.project_id,
    m.user_id,
    m.content,
    m.message_type,
    m.meet_link,
    m.referenced_task_id,
    m.thread_id,
    m.is_edited,
    m.created_at,
    m.updated_at,
    CASE 
      WHEN m.referenced_task_id IS NOT NULL THEN
        jsonb_build_object(
          'id', t.id,
          'title', t.title
        )
      ELSE NULL
    END as tasks
  FROM client_data.messages m
  LEFT JOIN client_data.tasks t ON m.referenced_task_id = t.id
  WHERE m.project_id = p_project_id
  ORDER BY m.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION client_data.create_message(UUID, UUID, TEXT, VARCHAR, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION client_data.get_project_messages(UUID, INTEGER, INTEGER) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION client_data.create_message(UUID, UUID, TEXT, VARCHAR, TEXT, UUID, UUID) IS 
'Creates a new message in a project with optional task reference and thread support';

COMMENT ON FUNCTION client_data.get_project_messages(UUID, INTEGER, INTEGER) IS 
'Retrieves messages for a project with pagination and task details';

-- Create trigger to update updated_at on message updates
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON client_data.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
