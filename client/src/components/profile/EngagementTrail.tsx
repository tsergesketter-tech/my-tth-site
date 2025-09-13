// src/components/profile/EngagementTrail.tsx
import React, { useEffect, useState } from 'react';

// Types based on Salesforce API documentation
type EngagementTrailStep = {
  id: string;
  name: string;
  description?: string;
  stepNumber: number;
  status: 'NotStarted' | 'InProgress' | 'Completed';
  completedDate?: string;
  requiredCount?: number;
  currentCount?: number;
  rewardPoints?: number;
  rewardTier?: string;
};

type EngagementTrailProgress = {
  promotionId: string;
  promotionName: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  totalSteps: number;
  completedSteps: number;
  currentStepNumber?: number;
  overallStatus: 'NotStarted' | 'InProgress' | 'Completed' | 'Expired';
  steps?: EngagementTrailStep[];
  enrollmentDate?: string;
  completionDate?: string;
  totalPossiblePoints?: number;
  earnedPoints?: number;
};

type EnrolledPromotion = {
  id: string;
  name: string;
  type: string;
  status: string;
  enrollmentDate: string;
  startDate?: string;
  endDate?: string;
};

interface EngagementTrailProps {
  membershipNumber: string;
}

export default function EngagementTrail({ membershipNumber }: EngagementTrailProps) {
  const [enrolledPromotions, setEnrolledPromotions] = useState<EnrolledPromotion[]>([]);
  const [engagementTrails, setEngagementTrails] = useState<EngagementTrailProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membershipNumber) return;

    const fetchEngagementTrails = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiBase = window.location.origin;

        // Step 1: Get enrolled promotions for the member
        console.log('🎯 Fetching enrolled promotions for member:', membershipNumber);
        const promotionsRes = await fetch(
          `${apiBase}/api/loyalty/member/${encodeURIComponent(membershipNumber)}/enrolled-promotions`,
          { credentials: 'include' }
        );

        if (!promotionsRes.ok) {
          throw new Error(`Failed to fetch enrolled promotions: ${promotionsRes.status}`);
        }

        const promotionsData = await promotionsRes.json();
        console.log('📋 Enrolled promotions:', promotionsData);
        
        const promotions = promotionsData.promotions || promotionsData || [];
        setEnrolledPromotions(promotions);

        // Step 2: Filter for Engagement Trail promotions
        // Check type, description, or name for engagement trail indicators
        const engagementTrailPromotions = promotions.filter(
          (promo: any) => 
            promo.type === 'EngagementTrail' || 
            promo.type === 'Engagement Trail' ||
            promo.type === 'ENGAGEMENT_TRAIL' ||
            promo.description === 'EngagementTrail' ||
            promo.description?.toLowerCase().includes('engagement') ||
            promo.name?.toLowerCase().includes('engagement trail')
        );

        console.log('🛤️ Engagement Trail promotions found:', engagementTrailPromotions.length);

        if (engagementTrailPromotions.length === 0) {
          setEngagementTrails([]);
          return;
        }

        // Step 3: Fetch progress for each Engagement Trail promotion
        const trailProgressPromises = engagementTrailPromotions.map(async (promo: EnrolledPromotion) => {
          try {
            console.log(`📈 Fetching progress for engagement trail: ${promo.name} (${promo.id})`);
            
            const progressRes = await fetch(
              `${apiBase}/api/loyalty/member/${encodeURIComponent(membershipNumber)}/engagement-trail/${encodeURIComponent(promo.id)}`,
              { credentials: 'include' }
            );

            if (!progressRes.ok) {
              console.warn(`Failed to fetch trail progress for ${promo.id}:`, progressRes.status);
              return null;
            }

            const progressData = await progressRes.json();
            console.log(`✅ Trail progress for ${promo.name}:`, progressData);

            return {
              promotionId: promo.id,
              promotionName: promo.name,
              description: progressData.description,
              startDate: promo.startDate || progressData.startDate,
              endDate: promo.endDate || progressData.endDate,
              totalSteps: progressData.totalSteps || progressData.steps?.length || 0,
              completedSteps: progressData.completedSteps || 
                progressData.steps?.filter((s: any) => s.status === 'Completed').length || 0,
              currentStepNumber: progressData.currentStepNumber || 
                (progressData.steps?.find((s: any) => s.status === 'InProgress')?.stepNumber) || 1,
              overallStatus: progressData.overallStatus || promo.status || 'NotStarted',
              steps: progressData.steps || [],
              enrollmentDate: promo.enrollmentDate,
              completionDate: progressData.completionDate,
              totalPossiblePoints: progressData.totalPossiblePoints || 
                progressData.steps?.reduce((sum: number, s: any) => sum + (s.rewardPoints || 0), 0) || 0,
              earnedPoints: progressData.earnedPoints || 
                progressData.steps?.filter((s: any) => s.status === 'Completed')
                  .reduce((sum: number, s: any) => sum + (s.rewardPoints || 0), 0) || 0,
            } as EngagementTrailProgress;

          } catch (err) {
            console.error(`Error fetching progress for trail ${promo.id}:`, err);
            return null;
          }
        });

        const trailResults = await Promise.all(trailProgressPromises);
        const validTrails = trailResults.filter((trail): trail is EngagementTrailProgress => trail !== null);
        
        console.log('🎯 Final engagement trails with progress:', validTrails);
        setEngagementTrails(validTrails);

      } catch (err: any) {
        console.error('❌ Error fetching engagement trails:', err);
        setError(err.message || 'Failed to load engagement trails');
      } finally {
        setLoading(false);
      }
    };

    fetchEngagementTrails();
  }, [membershipNumber]);

  const getStepIcon = (status: EngagementTrailStep['status']) => {
    switch (status) {
      case 'Completed':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'InProgress':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
        );
      case 'NotStarted':
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full">
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
        );
    }
  };

  const getStatusBadge = (status: EngagementTrailProgress['overallStatus']) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'Completed':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Completed</span>;
      case 'InProgress':
        return <span className={`${baseClasses} bg-indigo-100 text-indigo-800`}>In Progress</span>;
      case 'Expired':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Expired</span>;
      case 'NotStarted':
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Not Started</span>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-48" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Engagement Trails</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (engagementTrails.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Trails</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4a9.971 9.971 0 01.712-3.714m0 0A9.971 9.971 0 0118 32a9.971 9.971 0 013.288 2.286m0 0A9.971 9.971 0 0124 32a9.971 9.971 0 013.288 2.286" />
          </svg>
          <p className="text-gray-500">No engagement trails found</p>
          <p className="text-sm text-gray-400 mt-1">You're not currently enrolled in any engagement trail promotions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Engagement Trails</h3>
        <p className="text-sm text-gray-600 mt-1">Track your progress through multi-step promotions</p>
      </div>
      
      <div className="p-4 space-y-4">
        {engagementTrails.map((trail) => (
          <div key={trail.promotionId} className="border rounded-lg p-4 bg-gray-50">
            {/* Trail Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-base font-medium text-gray-900 truncate">{trail.promotionName}</h4>
                {trail.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{trail.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {trail.startDate && <span>Started: {formatDate(trail.startDate)}</span>}
                  {trail.endDate && <span>Ends: {formatDate(trail.endDate)}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {getStatusBadge(trail.overallStatus)}
                <div className="text-xs text-gray-600 mt-1">
                  {trail.completedSteps}/{trail.totalSteps} steps
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{Math.round((trail.completedSteps / trail.totalSteps) * 100)}%</span>
              </div>
              <div className="w-full bg-white rounded-full h-1.5">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(trail.completedSteps / trail.totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Points Summary */}
            {(trail.totalPossiblePoints || 0) > 0 && (
              <div className="flex justify-between items-center mb-4 p-2 bg-white rounded border">
                <span className="text-xs font-medium text-gray-700">Points</span>
                <span className="text-xs text-gray-900">
                  <span className="font-semibold text-indigo-600">{(trail.earnedPoints || 0).toLocaleString()}</span>
                  <span className="text-gray-500"> / {(trail.totalPossiblePoints || 0).toLocaleString()}</span>
                </span>
              </div>
            )}

            {/* Steps Timeline - Compact View */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-900">Steps ({trail.completedSteps}/{trail.totalSteps})</h5>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {(trail.steps || []).map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-3 p-2 bg-white rounded border">
                    {/* Step Icon - Smaller */}
                    <div className="flex-shrink-0">
                      {step.status === 'Completed' ? (
                        <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : step.status === 'InProgress' ? (
                        <div className="flex items-center justify-center w-5 h-5 bg-indigo-500 rounded-full">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-5 h-5 bg-gray-300 rounded-full">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>

                    {/* Step Content - Compact */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {step.stepNumber}. {step.name}
                        </p>
                        {step.rewardPoints && (
                          <span className="text-xs text-indigo-600 font-medium ml-2">
                            {step.rewardPoints.toLocaleString()}pts
                          </span>
                        )}
                      </div>

                      {/* Progress indicator for current step - inline */}
                      {step.status === 'InProgress' && step.requiredCount && step.currentCount !== undefined && (
                        <div className="flex items-center mt-1 space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-indigo-600 h-1 rounded-full"
                              style={{ width: `${Math.min((step.currentCount / step.requiredCount) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {step.currentCount}/{step.requiredCount}
                          </span>
                        </div>
                      )}

                      {/* Completion date - compact */}
                      {step.status === 'Completed' && step.completedDate && (
                        <p className="text-xs text-gray-400 mt-1">
                          ✓ {formatDate(step.completedDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}