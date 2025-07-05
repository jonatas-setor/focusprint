'use client';

import ChatContainer from './chat-container';

interface ProjectChatProps {
  projectId: string;
  availableTasks?: { id: string; title: string }[];
}

export default function ProjectChat({ projectId, availableTasks = [] }: ProjectChatProps) {
  return <ChatContainer projectId={projectId} availableTasks={availableTasks} />;
}
