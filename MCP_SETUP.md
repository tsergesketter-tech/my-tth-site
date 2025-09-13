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

### Your Evergage Integration

The implementation is pre-configured for your specific Evergage setup:

- **Dataset**: `tth_site`
- **Account ID**: `tsergesketter523012158` 
- **CDN**: `cdn.evgnet.com`
- **Script**: `//cdn.evgnet.com/beacon/tsergesketter523012158/tth_site/scripts/evergage.min.js`

### Environment Variables (Optional)

You can override defaults in your `.env` files:

```bash
# MCP Configuration (already configured for your setup)
REACT_APP_MCP_DATASET=tth_site
REACT_APP_MCP_REGION=tsergesketter523012158
REACT_APP_MCP_TRACKING_DOMAIN=cdn.evgnet.com
REACT_APP_MCP_COOKIE_DOMAIN=.yourdomain.com
```

### Ready to Use

✅ **No additional setup required!** The implementation uses your existing Evergage integration script and will work immediately.

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

### 🚀 **Immediate Actions**

1. **Deploy to Production**
   - The implementation is ready to deploy
   - Will automatically load your Evergage script
   - Start tracking user behavior immediately

2. **Verify Tracking** (Check in Evergage/MCP admin)
   - Page views should appear in real-time
   - User login events will be tracked
   - Search and view events will populate

3. **Create Personalization Campaigns**
   - Set up campaigns targeting the personalization zones:
     - `search-hero`, `search-results-top`, `search-results-bottom`
   - Configure audience segments
   - Design personalized content

### 🧪 **Testing the Implementation**

Once deployed, you can test by:
1. Opening browser dev tools
2. Navigating the site - watch for `[MCP]` console logs
3. Logging in - should see user identification logs
4. Searching for stays - should see search event tracking
5. Viewing stay details - should see view tracking

### 🎯 **Advanced Features** (Future)
   - Server-side rendering support
   - A/B testing integration
   - Advanced segmentation
   - Cross-device tracking

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