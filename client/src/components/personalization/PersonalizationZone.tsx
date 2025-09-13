// Personalization Zone Component for displaying MCP campaigns
import React, { useEffect, useRef, useState } from 'react';
import { useMCP } from '../../hooks/useMCP';

export interface PersonalizationZoneProps {
  zoneId: string;
  campaignId?: string;
  className?: string;
  fallbackContent?: React.ReactNode;
  onCampaignExecuted?: (campaign: any, result: any) => void;
  style?: React.CSSProperties;
}

export function PersonalizationZone({
  zoneId,
  campaignId,
  className = '',
  fallbackContent,
  onCampaignExecuted,
  style,
}: PersonalizationZoneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isReady, campaigns, executeCampaign, loadCampaigns } = useMCP({ autoInit: true });
  const [content, setContent] = useState<React.ReactNode>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Load and execute campaigns
  useEffect(() => {
    if (!isReady) return;

    const executePersonalization = async () => {
      setIsExecuting(true);
      
      try {
        // Load campaigns if not already loaded
        const availableCampaigns = campaigns.length > 0 ? campaigns : await loadCampaigns();
        
        // If specific campaign ID is provided, try to execute it
        if (campaignId) {
          const result = await executeCampaign(campaignId, containerRef.current || undefined);
          if (result) {
            onCampaignExecuted?.(availableCampaigns.find(c => c.id === campaignId), result);
            // Content will be injected directly into the DOM by MCP
            return;
          }
        }
        
        // Otherwise, look for campaigns targeting this zone
        const zoneCampaigns = availableCampaigns.filter(campaign => 
          campaign.zones?.includes(zoneId) || campaign.zone === zoneId
        );
        
        if (zoneCampaigns.length > 0) {
          // Execute the first matching campaign
          const campaign = zoneCampaigns[0];
          const result = await executeCampaign(campaign.id, containerRef.current || undefined);
          
          if (result) {
            onCampaignExecuted?.(campaign, result);
            return;
          }
        }
        
        // If no campaigns or execution failed, show fallback
        setContent(fallbackContent);
        
      } catch (error) {
        console.error(`[MCP] Failed to execute personalization for zone ${zoneId}:`, error);
        setContent(fallbackContent);
      } finally {
        setIsExecuting(false);
      }
    };

    executePersonalization();
  }, [isReady, zoneId, campaignId, campaigns, loadCampaigns, executeCampaign, fallbackContent, onCampaignExecuted]);

  return (
    <div
      ref={containerRef}
      className={`mcp-personalization-zone ${className}`}
      data-zone-id={zoneId}
      data-campaign-id={campaignId}
      style={style}
    >
      {isExecuting && (
        <div className="animate-pulse bg-gray-100 rounded h-24 flex items-center justify-center">
          <span className="text-gray-500 text-sm">Loading personalized content...</span>
        </div>
      )}
      {!isExecuting && content}
    </div>
  );
}

// Higher-order component for wrapping existing components with personalization
export function withPersonalization<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  zoneId: string,
  campaignId?: string
) {
  return function PersonalizedComponent(props: P) {
    const [showPersonalized, setShowPersonalized] = useState(false);
    
    return (
      <>
        <PersonalizationZone
          zoneId={zoneId}
          campaignId={campaignId}
          onCampaignExecuted={() => setShowPersonalized(true)}
          fallbackContent={null}
        />
        {!showPersonalized && <WrappedComponent {...props} />}
      </>
    );
  };
}