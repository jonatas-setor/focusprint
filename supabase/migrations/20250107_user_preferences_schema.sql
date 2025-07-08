-- Migration: User Preferences Schema Enhancement
-- Description: Define comprehensive user preferences structure for project personalization
-- Date: 2025-01-07

-- First, let's create a function to validate preferences structure
CREATE OR REPLACE FUNCTION client_data.validate_user_preferences(preferences_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate that preferences follow the expected structure
  -- This ensures data consistency and prevents invalid preference data
  
  -- Check if main sections exist
  IF NOT (preferences_data ? 'kanban' AND 
          preferences_data ? 'chat' AND 
          preferences_data ? 'dashboard' AND 
          preferences_data ? 'notifications' AND 
          preferences_data ? 'appearance') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate kanban preferences
  IF NOT (preferences_data->'kanban' ? 'column_width' AND 
          preferences_data->'kanban' ? 'card_style' AND 
          preferences_data->'kanban' ? 'show_task_count' AND 
          preferences_data->'kanban' ? 'auto_refresh') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate chat preferences
  IF NOT (preferences_data->'chat' ? 'notification_sound' AND 
          preferences_data->'chat' ? 'show_typing_indicator' AND 
          preferences_data->'chat' ? 'auto_scroll' AND 
          preferences_data->'chat' ? 'message_preview') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate dashboard preferences
  IF NOT (preferences_data->'dashboard' ? 'default_view' AND 
          preferences_data->'dashboard' ? 'projects_per_page' AND 
          preferences_data->'dashboard' ? 'show_archived' AND 
          preferences_data->'dashboard' ? 'sort_order') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate notification preferences
  IF NOT (preferences_data->'notifications' ? 'email_enabled' AND 
          preferences_data->'notifications' ? 'browser_enabled' AND 
          preferences_data->'notifications' ? 'task_updates' AND 
          preferences_data->'notifications' ? 'chat_messages' AND 
          preferences_data->'notifications' ? 'milestone_updates') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate appearance preferences
  IF NOT (preferences_data->'appearance' ? 'theme' AND 
          preferences_data->'appearance' ? 'color_scheme' AND 
          preferences_data->'appearance' ? 'font_size' AND 
          preferences_data->'appearance' ? 'compact_mode') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get default user preferences
CREATE OR REPLACE FUNCTION client_data.get_default_user_preferences()
RETURNS JSONB AS $$
BEGIN
  RETURN '{
    "kanban": {
      "column_width": "medium",
      "card_style": "detailed",
      "show_task_count": true,
      "auto_refresh": true,
      "collapsed_columns": [],
      "custom_colors": {},
      "task_card_fields": ["title", "description", "assignee", "due_date", "priority"],
      "drag_drop_enabled": true,
      "show_column_limits": true
    },
    "chat": {
      "notification_sound": true,
      "show_typing_indicator": true,
      "auto_scroll": true,
      "message_preview": true,
      "emoji_reactions": true,
      "file_preview": true,
      "chat_position": "right",
      "chat_width": 30,
      "message_grouping": true,
      "show_timestamps": true
    },
    "dashboard": {
      "default_view": "grid",
      "projects_per_page": 12,
      "show_archived": false,
      "sort_order": "updated_desc",
      "show_project_stats": true,
      "quick_actions_visible": true,
      "recent_projects_count": 5,
      "favorite_projects_first": true
    },
    "notifications": {
      "email_enabled": true,
      "browser_enabled": true,
      "task_updates": true,
      "chat_messages": true,
      "milestone_updates": true,
      "project_invites": true,
      "daily_digest": false,
      "quiet_hours": {
        "enabled": false,
        "start_time": "22:00",
        "end_time": "08:00"
      }
    },
    "appearance": {
      "theme": "system",
      "color_scheme": "blue",
      "font_size": "medium",
      "compact_mode": false,
      "sidebar_collapsed": false,
      "high_contrast": false,
      "reduce_animations": false
    },
    "workflow": {
      "auto_assign_tasks": false,
      "default_task_priority": "medium",
      "show_completed_tasks": false,
      "task_auto_archive_days": 30,
      "preferred_date_format": "DD/MM/YYYY",
      "preferred_time_format": "24h"
    },
    "mobile": {
      "swipe_gestures": true,
      "haptic_feedback": true,
      "auto_rotate": true,
      "touch_sensitivity": "medium",
      "mobile_chat_position": "bottom"
    }
  }'::JSONB;
END;
$$ LANGUAGE plpgsql;

-- Update existing client_profiles to have default preferences if they don't exist or are empty
UPDATE client_data.client_profiles 
SET preferences = client_data.get_default_user_preferences()
WHERE preferences IS NULL OR preferences = '{}'::JSONB;

-- Add constraint to ensure preferences follow the expected structure
ALTER TABLE client_data.client_profiles 
ADD CONSTRAINT check_preferences_structure 
CHECK (client_data.validate_user_preferences(preferences));

-- Create index for faster preference queries
CREATE INDEX IF NOT EXISTS idx_client_profiles_preferences_gin 
ON client_data.client_profiles USING GIN (preferences);

-- Create function to update user preferences safely
CREATE OR REPLACE FUNCTION client_data.update_user_preferences(
  p_user_id UUID,
  p_preferences_update JSONB
)
RETURNS JSONB AS $$
DECLARE
  current_preferences JSONB;
  updated_preferences JSONB;
BEGIN
  -- Get current preferences
  SELECT preferences INTO current_preferences
  FROM client_data.client_profiles
  WHERE user_id = p_user_id;
  
  -- If no current preferences, start with defaults
  IF current_preferences IS NULL THEN
    current_preferences := client_data.get_default_user_preferences();
  END IF;
  
  -- Merge the update with current preferences (deep merge)
  updated_preferences := current_preferences || p_preferences_update;
  
  -- Validate the updated preferences
  IF NOT client_data.validate_user_preferences(updated_preferences) THEN
    RAISE EXCEPTION 'Invalid preferences structure provided';
  END IF;
  
  -- Update the preferences
  UPDATE client_data.client_profiles
  SET preferences = updated_preferences,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN updated_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user preferences with fallback to defaults
CREATE OR REPLACE FUNCTION client_data.get_user_preferences(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_preferences JSONB;
BEGIN
  SELECT preferences INTO user_preferences
  FROM client_data.client_profiles
  WHERE user_id = p_user_id;
  
  -- If no preferences found, return defaults
  IF user_preferences IS NULL THEN
    RETURN client_data.get_default_user_preferences();
  END IF;
  
  RETURN user_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION client_data.validate_user_preferences(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION client_data.get_default_user_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION client_data.update_user_preferences(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION client_data.get_user_preferences(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION client_data.update_user_preferences(UUID, JSONB) IS 
'Safely updates user preferences with validation and deep merge functionality';

COMMENT ON FUNCTION client_data.get_user_preferences(UUID) IS 
'Retrieves user preferences with automatic fallback to default values';

COMMENT ON COLUMN client_data.client_profiles.preferences IS 
'JSONB column storing comprehensive user preferences for project personalization including kanban, chat, dashboard, notifications, appearance, workflow, and mobile settings';
