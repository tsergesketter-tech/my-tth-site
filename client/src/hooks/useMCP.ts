// React hook for Marketing Cloud Personalization
import { useEffect, useState, useCallback } from 'react';
import { mcpService, MCPEvent, MCPUser } from '../services/mcpService';

export interface UseMCPOptions {
  autoInit?: boolean;
  user?: MCPUser;
  trackPageViews?: boolean;
}

export function useMCP(options: UseMCPOptions = {}) {
  const { autoInit = true, user, trackPageViews = true } = options;
  
  const [isReady, setIsReady] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize MCP
  useEffect(() => {
    if (!autoInit) return;

    const init = async () => {
      try {
        setIsLoading(true);
        await mcpService.init();
        setIsReady(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize MCP');
        console.error('[MCP] Initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [autoInit]);

  // Identify user when provided
  useEffect(() => {
    if (isReady && user) {
      mcpService.identifyUser(user);
    }
  }, [isReady, user]);

  // Track page views
  useEffect(() => {
    if (isReady && trackPageViews) {
      mcpService.trackPageView();
    }
  }, [isReady, trackPageViews]);

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    if (!isReady) return [];
    
    try {
      const campaignList = await mcpService.getCampaigns();
      setCampaigns(campaignList);
      return campaignList;
    } catch (err) {
      console.error('[MCP] Failed to load campaigns:', err);
      return [];
    }
  }, [isReady]);

  // Track event wrapper
  const trackEvent = useCallback((event: MCPEvent) => {
    if (isReady) {
      mcpService.trackEvent(event);
    }
  }, [isReady]);

  // Track page view wrapper
  const trackPageView = useCallback((pageData?: Record<string, any>) => {
    if (isReady) {
      mcpService.trackPageView(pageData);
    }
  }, [isReady]);

  // Execute campaign wrapper
  const executeCampaign = useCallback(async (campaignId: string, element?: HTMLElement) => {
    if (!isReady) return null;
    
    try {
      return await mcpService.executeCampaign(campaignId, element);
    } catch (err) {
      console.error('[MCP] Failed to execute campaign:', err);
      return null;
    }
  }, [isReady]);

  return {
    isReady,
    isLoading,
    error,
    campaigns,
    trackEvent,
    trackPageView,
    loadCampaigns,
    executeCampaign,
    // Direct access to service for advanced use cases
    mcpService,
  };
}