// Marketing Cloud Personalization Service
import { mcpConfig, MCPEventType } from '../config/mcpConfig';

// Extend Window interface to include MCP
declare global {
  interface Window {
    SalesforceInteractions?: any;
    _et_debug_level?: number;
  }
}

export interface MCPUser {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  membershipNumber?: string;
  tierStatus?: string;
  pointsBalance?: number;
  attributes?: Record<string, any>;
}

export interface MCPEvent {
  type: MCPEventType;
  user?: MCPUser;
  data?: Record<string, any>;
}

export interface MCPCatalogItem {
  id: string;
  name: string;
  category?: string;
  price?: number;
  currency?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  attributes?: Record<string, any>;
}

class MCPService {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.loadSDK();
  }

  /**
   * Load the MCP SDK script
   */
  private loadSDK(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.SalesforceInteractions) {
        this.isInitialized = true;
        resolve();
        return;
      }

      // Create script tag
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = `https://${mcpConfig.region}.sitecore.net/api/js/dataset/${mcpConfig.dataset}`;

      script.onload = () => {
        this.isInitialized = true;
        this.configure();
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Marketing Cloud Personalization SDK'));
      };

      // Add to document head
      document.head.appendChild(script);
    });

    return this.initPromise;
  }

  /**
   * Configure MCP SDK after loading
   */
  private configure(): void {
    if (!window.SalesforceInteractions) return;

    const si = window.SalesforceInteractions;

    // Set debug mode
    if (mcpConfig.debug) {
      window._et_debug_level = 2;
      si.setDebug(true);
    }

    // Configure cookie domain
    if (mcpConfig.cookieDomain) {
      si.setCookieDomain(mcpConfig.cookieDomain);
    }

    // Auto page tracking
    if (mcpConfig.enableAutoPageTracking) {
      si.setAutoPageTracking(true);
    }

    console.log('[MCP] SDK configured successfully');
  }

  /**
   * Initialize MCP and wait for it to be ready
   */
  async init(): Promise<void> {
    await this.loadSDK();
    
    return new Promise((resolve) => {
      if (window.SalesforceInteractions) {
        window.SalesforceInteractions.ready(() => {
          console.log('[MCP] SDK ready');
          resolve();
        });
      }
    });
  }

  /**
   * Track page view
   */
  trackPageView(pageData?: Record<string, any>): void {
    if (!this.isInitialized || !window.SalesforceInteractions) return;

    const data = {
      path: window.location.pathname,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      ...pageData,
    };

    window.SalesforceInteractions.track('pageView', data);
    console.log('[MCP] Page view tracked:', data);
  }

  /**
   * Identify user
   */
  identifyUser(user: MCPUser): void {
    if (!this.isInitialized || !window.SalesforceInteractions) return;

    const userData = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      attributes: {
        membershipNumber: user.membershipNumber,
        tierStatus: user.tierStatus,
        pointsBalance: user.pointsBalance,
        ...user.attributes,
      },
    };

    window.SalesforceInteractions.setUser(userData);
    console.log('[MCP] User identified:', userData);
  }

  /**
   * Track custom event
   */
  trackEvent(event: MCPEvent): void {
    if (!this.isInitialized || !window.SalesforceInteractions) return;

    // If user data is provided, identify user first
    if (event.user) {
      this.identifyUser(event.user);
    }

    const eventData = {
      ...event.data,
      timestamp: new Date().toISOString(),
    };

    window.SalesforceInteractions.track(event.type, eventData);
    console.log(`[MCP] Event tracked: ${event.type}`, eventData);
  }

  /**
   * Track stay view
   */
  trackStayView(stay: any, user?: MCPUser): void {
    this.trackEvent({
      type: 'viewStay',
      user,
      data: {
        stayId: stay.id,
        stayName: stay.name,
        city: stay.city,
        nightlyRate: stay.nightlyRate,
        currency: stay.currency || 'USD',
        category: 'accommodation',
      },
    });
  }

  /**
   * Track stay search
   */
  trackStaySearch(searchParams: any, user?: MCPUser): void {
    this.trackEvent({
      type: 'searchStays',
      user,
      data: {
        searchTerm: searchParams.city,
        checkIn: searchParams.checkInISO,
        checkOut: searchParams.checkOutISO,
        guests: searchParams.guests,
        nights: searchParams.nights,
      },
    });
  }

  /**
   * Track booking
   */
  trackBooking(booking: any, user?: MCPUser): void {
    this.trackEvent({
      type: 'bookStay',
      user,
      data: {
        bookingId: booking.id,
        stayId: booking.stayId,
        totalAmount: booking.totalAmount,
        currency: booking.currency || 'USD',
        pointsUsed: booking.pointsUsed || 0,
        revenue: booking.totalAmount,
      },
    });
  }

  /**
   * Track points redemption
   */
  trackPointsRedemption(redemption: any, user?: MCPUser): void {
    this.trackEvent({
      type: 'redeemPoints',
      user,
      data: {
        pointsRedeemed: redemption.points,
        dollarValue: redemption.dollarValue,
        redemptionType: redemption.type,
      },
    });
  }

  /**
   * Track promotion view
   */
  trackPromotionView(promotions: any[], user?: MCPUser): void {
    this.trackEvent({
      type: 'viewPromotions',
      user,
      data: {
        promotionCount: promotions.length,
        promotionIds: promotions.map(p => p.id),
        promotionNames: promotions.map(p => p.name),
      },
    });
  }

  /**
   * Add catalog items (for personalization targeting)
   */
  addCatalogItem(item: MCPCatalogItem): void {
    if (!this.isInitialized || !window.SalesforceInteractions) return;

    window.SalesforceInteractions.catalogItem(item.id, {
      name: item.name,
      category: item.category,
      price: item.price,
      currency: item.currency,
      description: item.description,
      imageUrl: item.imageUrl,
      url: item.url,
      ...item.attributes,
    });
  }

  /**
   * Get personalization campaigns
   */
  getCampaigns(): Promise<any[]> {
    return new Promise((resolve) => {
      if (!this.isInitialized || !window.SalesforceInteractions) {
        resolve([]);
        return;
      }

      window.SalesforceInteractions.getCampaigns((campaigns: any[]) => {
        resolve(campaigns || []);
      });
    });
  }

  /**
   * Execute a specific campaign
   */
  executeCampaign(campaignId: string, element?: HTMLElement): Promise<any> {
    return new Promise((resolve) => {
      if (!this.isInitialized || !window.SalesforceInteractions) {
        resolve(null);
        return;
      }

      window.SalesforceInteractions.executeCampaign(campaignId, element, (result: any) => {
        resolve(result);
      });
    });
  }
}

// Export singleton instance
export const mcpService = new MCPService();
export default mcpService;