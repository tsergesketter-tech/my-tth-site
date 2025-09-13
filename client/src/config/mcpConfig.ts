// Marketing Cloud Personalization Configuration
export interface MCPConfig {
  dataset: string;
  region: string;
  trackingDomain?: string;
  debug?: boolean;
  cookieDomain?: string;
  enableAutoPageTracking?: boolean;
}

// MCP Configuration - Update these values with your actual MCP settings
export const mcpConfig: MCPConfig = {
  // Replace with your actual dataset name from MCP
  dataset: process.env.REACT_APP_MCP_DATASET || 'your-dataset-name',
  
  // Replace with your region (e.g., 'us', 'eu', 'ap')
  region: process.env.REACT_APP_MCP_REGION || 'us',
  
  // Optional: Custom tracking domain
  trackingDomain: process.env.REACT_APP_MCP_TRACKING_DOMAIN,
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
  
  // Cookie domain for tracking
  cookieDomain: process.env.REACT_APP_MCP_COOKIE_DOMAIN || window.location.hostname,
  
  // Auto-track page views
  enableAutoPageTracking: true,
};

// Event types for tracking
export const MCPEvents = {
  // E-commerce events
  VIEW_ITEM: 'viewItem',
  ADD_TO_CART: 'addToCart',
  PURCHASE: 'purchase',
  SEARCH: 'search',
  
  // Travel/booking specific events
  VIEW_STAY: 'viewStay',
  SEARCH_STAYS: 'searchStays',
  BOOK_STAY: 'bookStay',
  CANCEL_BOOKING: 'cancelBooking',
  
  // User events
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  
  // Loyalty events
  REDEEM_POINTS: 'redeemPoints',
  EARN_POINTS: 'earnPoints',
  VIEW_PROMOTIONS: 'viewPromotions',
  
  // Custom events
  CUSTOM: 'custom',
} as const;

export type MCPEventType = typeof MCPEvents[keyof typeof MCPEvents];