# Marketing Cloud Personalization (MCP) Implementation

This document outlines the Marketing Cloud Personalization implementation for the TTH site.

## Overview

The implementation includes:
- ✅ MCP SDK integration
- ✅ User identification and tracking
- ✅ Event tracking for key user actions
- ✅ Personalization zones for campaigns
- ✅ React hooks and components for easy integration

## Configuration

### Environment Variables

Add these to your `.env` files:

```bash
# MCP Configuration
REACT_APP_MCP_DATASET=your-dataset-name
REACT_APP_MCP_REGION=us
REACT_APP_MCP_TRACKING_DOMAIN=your-tracking-domain.com
REACT_APP_MCP_COOKIE_DOMAIN=.yourdomain.com
```

### MCP Dataset Setup

1. **Get your dataset name** from MCP admin
2. **Set your region** (us, eu, ap)
3. **Configure tracking domain** (optional)
4. **Set cookie domain** for cross-subdomain tracking

## Features Implemented

### 1. Automatic SDK Loading
- Loads MCP SDK dynamically
- Configures based on environment settings
- Debug mode in development

### 2. User Identification
- Identifies users on login/session restore
- Tracks membership numbers and attributes
- Preserves user context across sessions

### 3. Event Tracking
- **Page Views**: Automatic on route changes
- **Search**: Stay searches with filters
- **View Item**: Stay detail views
- **Login/Logout**: Authentication events
- **Custom Events**: Extensible framework

### 4. Personalization Zones
- `<PersonalizationZone>` component
- Multiple zones per page
- Fallback content support
- Campaign execution handling

## Usage Examples

### Basic Page Tracking
```tsx
import { useMCP } from '../hooks/useMCP';

function MyPage() {
  const { trackEvent, isReady } = useMCP({ autoInit: true });
  
  // Track custom event
  const handleBooking = () => {
    trackEvent({
      type: 'bookStay',
      data: { stayId, amount: 299.99 }
    });
  };
}
```

### Personalization Zone
```tsx
import { PersonalizationZone } from '../components/personalization/PersonalizationZone';

function SearchResults() {
  return (
    <div>
      <PersonalizationZone 
        zoneId="search-hero"
        className="mb-6"
        fallbackContent={<DefaultBanner />}
      />
    </div>
  );
}
```

## Personalization Zones

The following zones are implemented:

### Search Results Page
- `search-hero`: Hero banner area
- `search-results-top`: Above results list
- `search-results-bottom`: Below results list

### Stay Detail Page
- Ready for personalization zones

### Checkout Page
- Ready for personalization zones

## Event Types

| Event Type | Description | Data Fields |
|------------|-------------|-------------|
| `pageView` | Page navigation | path, url, title |
| `login` | User login | method, timestamp |
| `logout` | User logout | timestamp |
| `searchStays` | Stay search | searchTerm, dates, guests, resultsCount |
| `viewStay` | Stay detail view | stayId, name, city, rates, dates |
| `bookStay` | Booking completion | bookingId, amount, pointsUsed |
| `redeemPoints` | Points redemption | pointsRedeemed, dollarValue |

## Next Steps

1. **Configure MCP Dataset**
   - Update environment variables with real values
   - Test SDK loading and tracking

2. **Create Campaigns**
   - Set up campaigns in MCP admin
   - Configure targeting rules
   - Design personalized content

3. **Test Implementation**
   - Verify user identification
   - Check event tracking
   - Test personalization zones

4. **Advanced Features**
   - Server-side rendering support
   - A/B testing integration
   - Advanced segmentation

## Troubleshooting

### SDK Not Loading
- Check dataset name and region
- Verify network connectivity
- Check browser console for errors

### Events Not Tracking
- Ensure `isReady` is true before tracking
- Check event data structure
- Verify MCP debug logging

### Personalization Not Showing
- Verify campaigns are active in MCP
- Check zone IDs match campaign targeting
- Test with debug mode enabled

## Files Added

- `client/src/config/mcpConfig.ts` - Configuration
- `client/src/services/mcpService.ts` - SDK wrapper
- `client/src/hooks/useMCP.ts` - React hook
- `client/src/components/personalization/PersonalizationZone.tsx` - Personalization component
- Updated pages with tracking and personalization zones