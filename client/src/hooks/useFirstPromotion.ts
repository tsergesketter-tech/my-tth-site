// hooks/useFirstPromotion.ts
import { useState, useEffect } from "react";

type Promotion = {
  id?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  eligibility?: string;
  enrollmentRequired?: boolean;
};

const PROGRAM_NAME = "Cars and Stays by Delta";

export function useFirstPromotion() {
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFirstPromotion() {
      setLoading(true);
      setError(null);
      
      try {
        // Use the hardcoded member ID for now (same as used in other components)
        const response = await fetch("/api/loyalty/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            membershipNumber: "DL12345", 
            program: PROGRAM_NAME 
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const msg = data?.message || data?.[0]?.message || `HTTP ${response.status}`;
          throw new Error(msg);
        }

        // Get the first promotion from the response
        const promotions = data?.promotions || [];
        const firstPromotion = promotions.length > 0 ? promotions[0] : null;
        
        setPromotion(firstPromotion);
      } catch (err: any) {
        setError(err.message || "Failed to load promotion");
      } finally {
        setLoading(false);
      }
    }

    fetchFirstPromotion();
  }, []);

  return { promotion, loading, error };
}