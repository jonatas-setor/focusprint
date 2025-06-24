import PlanList from '@/components/admin/plans/plan-list';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function PlansPage() {
  return (
    <div className="p-6">
      <PlanList />
    </div>
  );
}
