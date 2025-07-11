import ClientRouteGuard from "@/components/client/auth/client-route-guard";
import { RealtimeProvider } from "@/contexts/realtime-context";
import { ProjectProvider } from "@/contexts/project-context";
import GlobalShortcutsProvider from "@/components/client/shared/global-shortcuts-provider";
import { ClientSidebar } from "@/components/client/shared/client-sidebar";
import { ClientHeader } from "@/components/client/shared/client-header";
import { ClientProfile } from "@/lib/auth/types";
import ClientDashboardContent from "@/components/client/layout/client-dashboard-content";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientRouteGuard>
      <RealtimeProvider>
        <ProjectProvider>
          <GlobalShortcutsProvider>
            <ClientDashboardContent>{children}</ClientDashboardContent>
          </GlobalShortcutsProvider>
        </ProjectProvider>
      </RealtimeProvider>
    </ClientRouteGuard>
  );
}
