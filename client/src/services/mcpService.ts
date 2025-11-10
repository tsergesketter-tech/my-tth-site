// Marketing Cloud Personalization Service
import { mcpConfig, MCPEventType } from '../config/mcpConfig';

// Extend Window interface to include MCP/Evergage
declare global {
  interface Window {
    SalesforceInteractions?: any;
    Evergage?: any;
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
    // Listen for CSP violations to help debug
    if (document) {
      document.addEventListener('securitypolicyviolation', (e) => {
        if (e.sourceFile?.includes('evergage') || e.sourceFile?.includes('evgnet')) {
          console.error('[MCP] CSP violation detected:', {
            blockedURI: e.blockedURI,
            violatedDirective: e.violatedDirective,
            sourceFile: e.sourceFile,
            lineNumber: e.lineNumber
          });
        }
      });
    }
    
    this.loadSDK();
  }

  /**
   * Get the available SDK instance (SalesforceInteractions or Evergage)
   */
  private getSDK(): any {
    return window.SalesforceInteractions || window.Evergage;
  }

  /**
   * Load the MCP SDK script
   */
  private loadSDK(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      console.log('[MCP] Loading SDK...');
      // Check if SDK is already loaded (either SalesforceInteractions or Evergage)
      if (window.SalesforceInteractions || window.Evergage) {
        this.isInitialized = true;
        resolve();
        return;
      }

      // Create script tag - using your specific Evergage integration
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = '//cdn.evgnet.com/beacon/tsergesketter523012158/tth_site/scripts/evergage.min.js';

      script.onload = () => {
        this.isInitialized = true;
        this.configure();
        resolve();
      };

      script.onerror = (error) => {
        console.error('[MCP] SDK loading failed:', error);
        console.error('[MCP] Script URL:', script.src);
        console.error('[MCP] Check CSP settings and network connectivity');
        reject(new Error('Failed to load Marketing Cloud Personalization SDK. Check CSP settings and console for details.'));
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
    const sdk = this.getSDK();
    if (!sdk) return;

    // Set debug mode
    if (mcpConfig.debug) {
      window._et_debug_level = 2;
      if (sdk.setDebug) {
        sdk.setDebug(true);
      }
    }

    // Configure cookie domain
    if (mcpConfig.cookieDomain && sdk.setCookieDomain) {
      sdk.setCookieDomain(mcpConfig.cookieDomain);
    }

    // Auto page tracking
    if (mcpConfig.enableAutoPageTracking && sdk.setAutoPageTracking) {
      sdk.setAutoPageTracking(true);
    }

    console.log('[MCP] SDK configured successfully');
  }

  /**
   * Initialize MCP and wait for it to be ready
   */
  async init(): Promise<void> {
    await this.loadSDK();
    
    return new Promise((resolve) => {
      const sdk = this.getSDK();
      if (sdk) {
        if (sdk.ready) {
          sdk.ready(() => {
            console.log('[MCP] SDK ready');
            resolve();
          });
        } else {
          // If ready method not available, resolve immediately
          console.log('[MCP] SDK ready (immediate)');
          resolve();
        }
      }
    });
  }

  /**
   * Track page view
   */
  trackPageView(pageData?: Record<string, any>): void {
    const sdk = this.getSDK();
    if (!this.isInitialized || !sdk) return;

    const data = {
      path: window.location.pathname,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      ...pageData,
    };

    if (sdk.track) {
      sdk.track('pageView', data);
      console.log('[MCP] Page view tracked:', data);
    }
  }

  /**
   * Identify user
   */
  identifyUser(user: MCPUser): void {
    const sdk = this.getSDK();
    if (!this.isInitialized || !sdk) return;

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

    if (sdk.setUser) {
      sdk.setUser(userData);
      console.log('[MCP] User identified:', userData);
    }
  }

  /**
   * Track custom event
   */
  trackEvent(event: MCPEvent): void {
    const sdk = this.getSDK();
    if (!this.isInitialized || !sdk) return;

    // If user data is provided, identify user first
    if (event.user) {
      this.identifyUser(event.user);
    }

    const eventData = {
      ...event.data,
      timestamp: new Date().toISOString(),
    };

    if (sdk.track) {
      sdk.track(event.type, eventData);
      console.log(`[MCP] Event tracked: ${event.type}`, eventData);
    }
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
    const sdk = this.getSDK();
    if (!this.isInitialized || !sdk) return;

    if (sdk.catalogItem) {
      sdk.catalogItem(item.id, {
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
  }

  /**
   * Get personalization campaigns
   */
  getCampaigns(): Promise<any[]> {
    return new Promise((resolve) => {
      const sdk = this.getSDK();
      if (!this.isInitialized || !sdk) {
        resolve([]);
        return;
      }

      if (sdk.getCampaigns) {
        sdk.getCampaigns((campaigns: any[]) => {
          resolve(campaigns || []);
        });
      } else {
        resolve([]);
      }
    });
  }

  /**
   * Execute a specific campaign
   */
  executeCampaign(campaignId: string, element?: HTMLElement): Promise<any> {
    return new Promise((resolve) => {
      const sdk = this.getSDK();
      if (!this.isInitialized || !sdk) {
        resolve(null);
        return;
      }

      if (sdk.executeCampaign) {
        sdk.executeCampaign(campaignId, element, (result: any) => {
          resolve(result);
        });
      } else {
        resolve(null);
      }
    });
  }
}

// Export singleton instance
export const mcpService = new MCPService();
export default mcpService;