/**
 * Task Reference Parser Utility
 * Handles parsing, validation, and formatting of #task references in chat messages
 */

export interface TaskReference {
  id: string;
  title: string;
  position: {
    start: number;
    end: number;
  };
}

export interface ParsedMessage {
  content: string;
  taskReferences: TaskReference[];
}

/**
 * Regex patterns for task references
 */
export const TASK_REFERENCE_PATTERNS = {
  // Match #task followed by task ID (UUID format)
  FULL_UUID: /#([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi,

  // Match #task followed by partial ID (for auto-complete)
  PARTIAL_UUID: /#([a-f0-9-]{1,36})/gi,

  // Match # followed by any text (for auto-complete trigger)
  HASH_TRIGGER: /#([a-zA-Z0-9-]*)/g
};

/**
 * Parse message content to extract task references
 */
export function parseTaskReferences(content: string): { taskIds: string[], positions: Array<{start: number, end: number, id: string}> } {
  const taskIds: string[] = [];
  const positions: Array<{start: number, end: number, id: string}> = [];

  let match;
  const regex = new RegExp(TASK_REFERENCE_PATTERNS.FULL_UUID.source, 'gi');

  while ((match = regex.exec(content)) !== null) {
    const taskId = match[1];
    if (!taskIds.includes(taskId)) {
      taskIds.push(taskId);
    }

    positions.push({
      start: match.index,
      end: match.index + match[0].length,
      id: taskId
    });
  }

  return { taskIds, positions };
}

/**
 * Validate that task IDs exist in the project
 */
export async function validateTaskReferences(taskIds: string[], projectId: string): Promise<Map<string, { id: string, title: string }>> {
  if (taskIds.length === 0) {
    return new Map();
  }
  
  try {
    const response = await fetch(`/api/client/projects/${projectId}/tasks/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskIds })
    });
    
    if (!response.ok) {
      console.error('Failed to validate task references');
      return new Map();
    }
    
    const data = await response.json();
    const validTasks = new Map();
    
    data.tasks?.forEach((task: { id: string, title: string }) => {
      validTasks.set(task.id, task);
    });
    
    return validTasks;
  } catch (error) {
    console.error('Error validating task references:', error);
    return new Map();
  }
}

/**
 * Format message content with highlighted task references
 * Returns data structure that can be used by React components
 */
export interface MessagePart {
  type: 'text' | 'task-reference' | 'invalid-task-reference';
  content: string;
  task?: { id: string, title: string };
  position?: { start: number, end: number };
}

export function formatMessageWithTaskReferences(
  content: string,
  validTasks: Map<string, { id: string, title: string }>
): MessagePart[] {
  const { positions } = parseTaskReferences(content);

  if (positions.length === 0) {
    return [{ type: 'text', content }];
  }

  const parts: MessagePart[] = [];
  let lastIndex = 0;

  positions.forEach((pos) => {
    // Add text before the reference
    if (pos.start > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, pos.start)
      });
    }

    // Add the task reference
    const task = validTasks.get(pos.id);
    if (task) {
      parts.push({
        type: 'task-reference',
        content: `#${task.title}`,
        task,
        position: pos
      });
    } else {
      parts.push({
        type: 'invalid-task-reference',
        content: `#${pos.id.substring(0, 8)}...`,
        position: pos
      });
    }

    lastIndex = pos.end;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }

  return parts;
}

/**
 * Extract task query from current cursor position
 */
export function extractTaskQuery(content: string, cursorPosition: number): { query: string, start: number, end: number } | null {
  // Find the last # before cursor position
  const beforeCursor = content.substring(0, cursorPosition);
  const hashIndex = beforeCursor.lastIndexOf('#');
  
  if (hashIndex === -1) {
    return null;
  }
  
  // Find the end of the query (space, newline, or end of string)
  const afterHash = content.substring(hashIndex + 1);
  const endMatch = afterHash.match(/[\s\n]/);
  const queryEnd = endMatch ? hashIndex + 1 + endMatch.index! : content.length;
  
  // Make sure cursor is within the query
  if (cursorPosition > queryEnd) {
    return null;
  }
  
  const query = content.substring(hashIndex + 1, queryEnd);
  
  return {
    query,
    start: hashIndex,
    end: queryEnd
  };
}

/**
 * Search tasks for auto-complete
 */
export async function searchTasksForAutoComplete(query: string, projectId: string): Promise<Array<{ id: string, title: string }>> {
  if (query.length < 1) {
    return [];
  }
  
  try {
    const response = await fetch(`/api/client/projects/${projectId}/tasks/search?q=${encodeURIComponent(query)}&limit=5`);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.tasks || [];
  } catch (error) {
    console.error('Error searching tasks:', error);
    return [];
  }
}
