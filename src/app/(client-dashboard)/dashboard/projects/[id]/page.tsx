import UnifiedProjectLayout from '@/components/client/layout/unified-project-layout';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  return (
    <UnifiedProjectLayout projectId={id} />
  );
}
