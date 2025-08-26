// client/src/hooks/useAuth.ts
// React hook for authentication state management

import { useState, useEffect, useCallback } from "react";
import type { Member } from "../utils/auth";
import { getCurrentMember, ensureSession } from "../utils/auth";

export function useAuth() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const session = await ensureSession();
      setMember(session);
    } catch (err: any) {
      setError(err.message || "Failed to initialize authentication");
      console.error("Auth initialization failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const currentMember = await getCurrentMember();
      setMember(currentMember);
      return currentMember;
    } catch (err: any) {
      console.error("Failed to refresh auth:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return {
    member,
    loading,
    error,
    isAuthenticated: !!member,
    refreshAuth,
    initializeAuth
  };
}