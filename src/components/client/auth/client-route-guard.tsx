"use client";

interface ClientRouteGuardProps {
  children: React.ReactNode;
}

export default function ClientRouteGuard({ children }: ClientRouteGuardProps) {
  // 🚨 TEMPORARILY DISABLED FOR DEBUGGING
  console.log("🔧 ClientRouteGuard: COMPLETELY DISABLED - Direct access");

  // Direct access without any checks
  return <>{children}</>;
}
