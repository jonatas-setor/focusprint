"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClientAuthService } from "@/lib/auth/client";
import { supabase } from "@/lib/supabase/client";

interface ClientRouteGuardProps {
  children: React.ReactNode;
}

export default function ClientRouteGuard({ children }: ClientRouteGuardProps) {
  // 🚨 TEMPORARILY DISABLED FOR DEBUGGING
  console.log(
    "🔧 ClientRouteGuard: TEMPORARILY DISABLED - Allowing all access"
  );

  // Skip all authentication checks and allow direct access
  return <>{children}</>;
}
