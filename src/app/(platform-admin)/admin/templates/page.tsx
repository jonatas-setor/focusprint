import TemplateManagement from '@/components/admin/templates/template-management';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
  return (
    <div className="p-6">
      <TemplateManagement />
    </div>
  );
}
