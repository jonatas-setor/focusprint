'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Types for user preferences
export interface UserPreferences {
  kanban: {
    column_width: 'small' | 'medium' | 'large';
    card_style: 'compact' | 'detailed';
    show_task_count: boolean;
    auto_refresh: boolean;
    collapsed_columns: string[];
    custom_colors: Record<string, string>;
    task_card_fields: string[];
    drag_drop_enabled: boolean;
    show_column_limits: boolean;
  };
  chat: {
    notification_sound: boolean;
    show_typing_indicator: boolean;
    auto_scroll: boolean;
    message_preview: boolean;
    emoji_reactions: boolean;
    file_preview: boolean;
    chat_position: 'right' | 'left' | 'bottom';
    chat_width: number;
    message_grouping: boolean;
    show_timestamps: boolean;
  };
  dashboard: {
    default_view: 'grid' | 'list';
    projects_per_page: number;
    show_archived: boolean;
    sort_order: 'name_asc' | 'name_desc' | 'updated_asc' | 'updated_desc' | 'created_asc' | 'created_desc';
    show_project_stats: boolean;
    quick_actions_visible: boolean;
    recent_projects_count: number;
    favorite_projects_first: boolean;
  };
  notifications: {
    email_enabled: boolean;
    browser_enabled: boolean;
    task_updates: boolean;
    chat_messages: boolean;
    milestone_updates: boolean;
    project_invites: boolean;
    daily_digest: boolean;
    quiet_hours: {
      enabled: boolean;
      start_time: string;
      end_time: string;
    };
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    color_scheme: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    font_size: 'small' | 'medium' | 'large';
    compact_mode: boolean;
    sidebar_collapsed: boolean;
    high_contrast: boolean;
    reduce_animations: boolean;
  };
  workflow: {
    auto_assign_tasks: boolean;
    default_task_priority: 'low' | 'medium' | 'high' | 'urgent';
    show_completed_tasks: boolean;
    task_auto_archive_days: number;
    preferred_date_format: string;
    preferred_time_format: '12h' | '24h';
  };
  mobile: {
    swipe_gestures: boolean;
    haptic_feedback: boolean;
    auto_rotate: boolean;
    touch_sensitivity: 'low' | 'medium' | 'high';
    mobile_chat_position: 'bottom' | 'top';
  };
}

export type PreferenceSection = keyof UserPreferences;

interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;
  updateSection: <T extends PreferenceSection>(
    section: T,
    updates: Partial<UserPreferences[T]>
  ) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  refreshPreferences: () => Promise<void>;
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🎨 [USER PREFERENCES HOOK] Hook initialized');

  // Fetch preferences from API
  const fetchPreferences = useCallback(async () => {
    console.log('📡 [USER PREFERENCES HOOK] Fetching preferences...');
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/client/preferences');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch preferences');
      }

      console.log('✅ [USER PREFERENCES HOOK] Preferences fetched successfully');
      setPreferences(data.preferences);
      
    } catch (err) {
      console.error('❌ [USER PREFERENCES HOOK] Error fetching preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferences';
      setError(errorMessage);
      toast.error('Erro ao carregar preferências');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update full preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>): Promise<boolean> => {
    console.log('📝 [USER PREFERENCES HOOK] Updating preferences:', Object.keys(updates));
    try {
      setError(null);

      const response = await fetch('/api/client/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: updates }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update preferences');
      }

      console.log('✅ [USER PREFERENCES HOOK] Preferences updated successfully');
      setPreferences(data.preferences);
      toast.success('Preferências atualizadas com sucesso');
      return true;
      
    } catch (err) {
      console.error('❌ [USER PREFERENCES HOOK] Error updating preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      toast.error('Erro ao atualizar preferências');
      return false;
    }
  }, []);

  // Update specific section
  const updateSection = useCallback(async <T extends PreferenceSection>(
    section: T,
    updates: Partial<UserPreferences[T]>
  ): Promise<boolean> => {
    console.log(`📝 [USER PREFERENCES HOOK] Updating section ${section}:`, Object.keys(updates));
    try {
      setError(null);

      const response = await fetch(`/api/client/preferences/${section}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: updates }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${section} preferences: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || `Failed to update ${section} preferences`);
      }

      console.log(`✅ [USER PREFERENCES HOOK] Section ${section} updated successfully`);
      setPreferences(data.full_preferences);
      toast.success(`Preferências de ${section} atualizadas`);
      return true;
      
    } catch (err) {
      console.error(`❌ [USER PREFERENCES HOOK] Error updating section ${section}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to update ${section} preferences`;
      setError(errorMessage);
      toast.error(`Erro ao atualizar preferências de ${section}`);
      return false;
    }
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    console.log('🔄 [USER PREFERENCES HOOK] Resetting preferences to defaults...');
    try {
      setError(null);

      const response = await fetch('/api/client/preferences', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to reset preferences: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reset preferences');
      }

      console.log('✅ [USER PREFERENCES HOOK] Preferences reset to defaults successfully');
      setPreferences(data.preferences);
      toast.success('Preferências restauradas para os padrões');
      return true;
      
    } catch (err) {
      console.error('❌ [USER PREFERENCES HOOK] Error resetting preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset preferences';
      setError(errorMessage);
      toast.error('Erro ao restaurar preferências');
      return false;
    }
  }, []);

  // Refresh preferences
  const refreshPreferences = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  // Load preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    updateSection,
    resetToDefaults,
    refreshPreferences,
  };
}
