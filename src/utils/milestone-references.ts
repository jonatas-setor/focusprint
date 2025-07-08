/**
 * Milestone Reference Parser Utility
 * Handles parsing, validation, and formatting of @milestone references in chat messages
 */

export interface MilestoneReference {
  id: string;
  name: string;
  progress_percentage: number;
  status: string;
  position: {
    start: number;
    end: number;
  };
}

export interface ParsedMilestoneMessage {
  content: string;
  milestoneReferences: MilestoneReference[];
}

/**
 * Regex patterns for milestone references
 */
export const MILESTONE_REFERENCE_PATTERNS = {
  // Match @milestone followed by milestone ID (UUID format)
  FULL_UUID: /@milestone:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi,

  // Match @milestone followed by partial ID (for auto-complete)
  PARTIAL_UUID: /@milestone:([a-f0-9-]{1,36})/gi,

  // Match @milestone followed by any text (for auto-complete trigger)
  MILESTONE_TRIGGER: /@milestone:?([a-zA-Z0-9-]*)/g,

  // Match @milestone without colon for simple trigger
  SIMPLE_TRIGGER: /@milestone([a-zA-Z0-9-]*)/g
};

/**
 * Parse message content to extract milestone references
 */
export function parseMilestoneReferences(content: string): { 
  milestoneIds: string[], 
  positions: Array<{start: number, end: number, id: string}> 
} {
  const milestoneIds: string[] = [];
  const positions: Array<{start: number, end: number, id: string}> = [];

  let match;
  const regex = new RegExp(MILESTONE_REFERENCE_PATTERNS.FULL_UUID.source, 'gi');

  while ((match = regex.exec(content)) !== null) {
    const milestoneId = match[1];
    if (!milestoneIds.includes(milestoneId)) {
      milestoneIds.push(milestoneId);
    }

    positions.push({
      start: match.index,
      end: match.index + match[0].length,
      id: milestoneId
    });
  }

  return { milestoneIds, positions };
}

/**
 * Extract milestone query from message at cursor position
 * Used for auto-complete functionality
 */
export function extractMilestoneQuery(message: string, cursorPosition: number): {
  query: string;
  start: number;
  end: number;
} | null {
  // Look backwards from cursor to find @milestone trigger
  let start = cursorPosition;
  while (start > 0 && message[start - 1] !== '@') {
    start--;
  }

  // Check if we found @milestone
  if (start === 0 || message.substring(start - 1, start + 9) !== '@milestone') {
    return null;
  }

  // Adjust start to include @milestone
  start = start - 1;

  // Look forward to find end of query (space, newline, or end of message)
  let end = cursorPosition;
  while (end < message.length && !/\s/.test(message[end])) {
    end++;
  }

  // Extract query part after @milestone:
  const fullMatch = message.substring(start, end);
  const colonIndex = fullMatch.indexOf(':');
  const query = colonIndex !== -1 ? fullMatch.substring(colonIndex + 1) : '';

  return {
    query,
    start,
    end
  };
}

/**
 * Search milestones for auto-complete
 */
export async function searchMilestonesForAutoComplete(
  query: string, 
  projectId: string
): Promise<Array<{id: string, name: string, progress_percentage: number, status: string}>> {
  try {
    const response = await fetch(
      `/api/client/projects/${projectId}/milestones?search=${encodeURIComponent(query)}&limit=5`
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.milestones || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error searching milestones:', error);
    return [];
  }
}

/**
 * Format message content with highlighted milestone references
 * Returns data structure that can be used by React components
 */
export interface MilestoneMessagePart {
  type: 'text' | 'milestone-reference' | 'invalid-milestone-reference';
  content: string;
  milestone?: { 
    id: string, 
    name: string, 
    progress_percentage: number,
    status: string 
  };
  position?: { start: number, end: number };
}

export function formatMessageWithMilestoneReferences(
  content: string,
  validMilestones: Map<string, { 
    id: string, 
    name: string, 
    progress_percentage: number,
    status: string 
  }>
): MilestoneMessagePart[] {
  const { positions } = parseMilestoneReferences(content);

  if (positions.length === 0) {
    return [{ type: 'text', content }];
  }

  const parts: MilestoneMessagePart[] = [];
  let lastIndex = 0;

  positions.forEach((pos) => {
    // Add text before the reference
    if (pos.start > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, pos.start)
      });
    }

    // Add the milestone reference
    const milestone = validMilestones.get(pos.id);
    if (milestone) {
      parts.push({
        type: 'milestone-reference',
        content: `@${milestone.name}`,
        milestone,
        position: pos
      });
    } else {
      parts.push({
        type: 'invalid-milestone-reference',
        content: `@milestone:${pos.id.substring(0, 8)}...`,
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
 * Get milestone status color
 */
export function getMilestoneStatusColor(status: string): string {
  switch (status) {
    case 'not_started':
      return 'text-gray-600 bg-gray-100';
    case 'in_progress':
      return 'text-blue-600 bg-blue-100';
    case 'completed':
      return 'text-green-600 bg-green-100';
    case 'on_hold':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get milestone status label
 */
export function getMilestoneStatusLabel(status: string): string {
  switch (status) {
    case 'not_started':
      return 'Não iniciado';
    case 'in_progress':
      return 'Em progresso';
    case 'completed':
      return 'Concluído';
    case 'on_hold':
      return 'Em espera';
    default:
      return 'Desconhecido';
  }
}

/**
 * Validate milestone reference format
 */
export function isValidMilestoneReference(reference: string): boolean {
  return MILESTONE_REFERENCE_PATTERNS.FULL_UUID.test(reference);
}

/**
 * Extract milestone ID from reference
 */
export function extractMilestoneId(reference: string): string | null {
  const match = reference.match(MILESTONE_REFERENCE_PATTERNS.FULL_UUID);
  return match ? match[1] : null;
}

/**
 * Create milestone reference string
 */
export function createMilestoneReference(milestoneId: string): string {
  return `@milestone:${milestoneId}`;
}

/**
 * Combined parser for both task and milestone references
 */
export interface CombinedMessagePart {
  type: 'text' | 'task-reference' | 'milestone-reference' | 'invalid-task-reference' | 'invalid-milestone-reference';
  content: string;
  task?: { id: string, title: string };
  milestone?: { 
    id: string, 
    name: string, 
    progress_percentage: number,
    status: string 
  };
  position?: { start: number, end: number };
}

export function formatMessageWithAllReferences(
  content: string,
  validTasks: Map<string, { id: string, title: string }>,
  validMilestones: Map<string, { 
    id: string, 
    name: string, 
    progress_percentage: number,
    status: string 
  }>
): CombinedMessagePart[] {
  // Import task reference functions
  const { parseTaskReferences } = require('./task-references');
  
  const { positions: taskPositions } = parseTaskReferences(content);
  const { positions: milestonePositions } = parseMilestoneReferences(content);

  // Combine and sort all positions
  const allPositions = [
    ...taskPositions.map(pos => ({ ...pos, type: 'task' as const })),
    ...milestonePositions.map(pos => ({ ...pos, type: 'milestone' as const }))
  ].sort((a, b) => a.start - b.start);

  if (allPositions.length === 0) {
    return [{ type: 'text', content }];
  }

  const parts: CombinedMessagePart[] = [];
  let lastIndex = 0;

  allPositions.forEach((pos) => {
    // Add text before the reference
    if (pos.start > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, pos.start)
      });
    }

    // Add the reference based on type
    if (pos.type === 'task') {
      const task = validTasks.get(pos.id);
      if (task) {
        parts.push({
          type: 'task-reference',
          content: `#${task.title}`,
          task,
          position: { start: pos.start, end: pos.end }
        });
      } else {
        parts.push({
          type: 'invalid-task-reference',
          content: `#${pos.id.substring(0, 8)}...`,
          position: { start: pos.start, end: pos.end }
        });
      }
    } else if (pos.type === 'milestone') {
      const milestone = validMilestones.get(pos.id);
      if (milestone) {
        parts.push({
          type: 'milestone-reference',
          content: `@${milestone.name}`,
          milestone,
          position: { start: pos.start, end: pos.end }
        });
      } else {
        parts.push({
          type: 'invalid-milestone-reference',
          content: `@milestone:${pos.id.substring(0, 8)}...`,
          position: { start: pos.start, end: pos.end }
        });
      }
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
