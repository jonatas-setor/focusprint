'use client';

import ChatContainer from './chat-container';

interface ProjectChatProps {
  projectId: string;
  availableTasks?: { id: string; title: string }[];
  availableMilestones?: {
    id: string;
    name: string;
    progress_percentage: number;
    status: string;
  }[];
}

export default function ProjectChat({
  projectId,
  availableTasks = [],
  availableMilestones = []
}: ProjectChatProps) {
  return (
    <ChatContainer
      projectId={projectId}
      availableTasks={availableTasks}
      availableMilestones={availableMilestones}
    />
  );
}
