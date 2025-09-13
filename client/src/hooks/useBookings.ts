// client/src/hooks/useBookings.ts
// React hook for managing bookings and cancellation workflows

import { useState, useEffect, useCallback } from "react";
import type { 
  TripBooking, 
  CancellationRequest,
  CancellationPlan,
  CancellationResult
} from "@teddy/shared";
import { 
  fetchUserBookings,
  fetchBooking,
  previewCancellation,
  executeCancellation,
  getUpcomingBookings
} from "../utils/bookingApi";
import { useAuth } from "./useAuth";

export function useBookings() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUserBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      loadBookings();
    }
  }, [loadBookings, authLoading]);

  const refreshBooking = useCallback(async (bookingId: string) => {
    try {
      const updatedBooking = await fetchBooking(bookingId);
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId ? updatedBooking : booking
        )
      );
      return updatedBooking;
    } catch (err: any) {
      console.error("Failed to refresh booking:", err);
      throw err;
    }
  }, []);

  const upcomingBookings = getUpcomingBookings(bookings);

  return {
    bookings,
    upcomingBookings,
    loading: authLoading || loading,
    error,
    loadBookings,
    refreshBooking
  };
}

export function useCancellation(bookingId: string) {
  const [previewData, setPreviewData] = useState<{
    plan: CancellationPlan;
    summary: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useCallback(async (
    request: Omit<CancellationRequest, 'bookingId'>
  ) => {
    try {
      setLoading(true);
      setError(null);
      const data = await previewCancellation(bookingId, request);
      setPreviewData(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to preview cancellation");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const execute = useCallback(async (
    request: Omit<CancellationRequest, 'bookingId'>
  ): Promise<{ result: CancellationResult; booking: TripBooking; summary: any }> => {
    try {
      setExecuting(true);
      setError(null);
      const data = await executeCancellation(bookingId, { ...request, confirm: true });
      
      // Clear preview data after successful execution
      setPreviewData(null);
      
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to execute cancellation");
      throw err;
    } finally {
      setExecuting(false);
    }
  }, [bookingId]);

  const clearPreview = useCallback(() => {
    setPreviewData(null);
    setError(null);
  }, []);

  return {
    previewData,
    loading,
    executing,
    error,
    preview,
    execute,
    clearPreview
  };
}