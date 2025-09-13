# Evergage Personalized Hero Campaigns

## Travel Preference-Based Hero Personalization

### Campaign Configuration Overview

Each travel type selected on `/destination-type` page will trigger personalized hero experiences with:
- Custom background images
- Targeted messaging
- Relevant CTAs

---

## Campaign Setup Templates

### 1. Beach & Coastal Campaign

**Trigger Conditions:**
```javascript
user.travelPreference.equals("beach")
```

**Variables:**
```javascript
{
  "imageURL": "/images/maldives-beach.jpg",
  "header": "Escape to Paradise",
  "subheader": "Discover pristine beaches and oceanfront luxury resorts",
  "ctaText": "Find Beach Getaways",
  "ctaAction": "SalesforceInteractions.sendEvent({interaction: {name: 'beachCTAClick', source: 'personalizedHero'}});"
}
```

---

### 2. Mountain & Ski Campaign

**Trigger Conditions:**
```javascript
user.travelPreference.equals("mountain")
```

**Variables:**
```javascript
{
  "imageURL": "/images/winter-resort.jpg", 
  "header": "Mountain Adventures Await",
  "subheader": "Cozy lodges, ski slopes, and alpine luxury",
  "ctaText": "Explore Mountain Retreats",
  "ctaAction": "SalesforceInteractions.sendEvent({interaction: {name: 'mountainCTAClick', source: 'personalizedHero'}});"
}
```

---

### 3. City & Urban Campaign

**Trigger Conditions:**
```javascript
user.travelPreference.equals("city")
```

**Variables:**
```javascript
{
  "imageURL": "/images/urban-skyline.jpg",
  "header": "Urban Exploration Awaits", 
  "subheader": "Discover vibrant cities and downtown luxury hotels",
  "ctaText": "Browse City Hotels",
  "ctaAction": "SalesforceInteractions.sendEvent({interaction: {name: 'cityCTAClick', source: 'personalizedHero'}});"
}
```

---

### 4. Adventure & Nature Campaign

**Trigger Conditions:**
```javascript
user.travelPreference.equals("adventure")
```

**Variables:**
```javascript
{
  "imageURL": "/images/forest-cabin.jpg",
  "header": "Wild Adventures Call",
  "subheader": "National parks, eco-lodges, and outdoor experiences",
  "ctaText": "Plan Your Adventure", 
  "ctaAction": "SalesforceInteractions.sendEvent({interaction: {name: 'adventureCTAClick', source: 'personalizedHero'}});"
}
```

---

### 5. Luxury & Spa Campaign

**Trigger Conditions:**
```javascript
user.travelPreference.equals("luxury")
```

**Variables:**
```javascript
{
  "imageURL": "/images/luxury-resort.jpg",
  "header": "Indulge in Luxury",
  "subheader": "Premium resorts, spa retreats, and exclusive experiences", 
  "ctaText": "Discover Luxury Stays",
  "ctaAction": "SalesforceInteractions.sendEvent({interaction: {name: 'luxuryCTAClick', source: 'personalizedHero'}});"
}
```

---

### 6. Cultural & Historic Campaign

**Trigger Conditions:**
```javascript
user.travelPreference.equals("cultural")
```

**Variables:**
```javascript
{
  "imageURL": "/images/cultural-city.jpg",
  "header": "Discover Rich Heritage",
  "subheader": "Historic hotels, cultural sites, and timeless destinations",
  "ctaText": "Explore Heritage Hotels",
  "ctaAction": "SalesforceInteractions.sendEvent({interaction: {name: 'culturalCTAClick', source: 'personalizedHero'}});"
}
```

---

## Advanced Personalization Rules

### Multi-Factor Targeting
Combine travel preference with other data:

```javascript
// Luxury + Loyalty Member
user.travelPreference.equals("luxury") && user.tier.exists()

// Beach + Return Visitor  
user.travelPreference.equals("beach") && user.visitCount.greaterThan(1)

// Mountain + Winter Season
user.travelPreference.equals("mountain") && currentDate.isBetween("2024-12-01", "2025-03-31")
```

### Dynamic Variables Based on Preference

```javascript
{
  "header": "{{#if user.firstName}}Welcome back, {{user.firstName}}!{{else}}{{campaign.defaultHeader}}{{/if}}",
  "subheader": "{{#if user.tier}}Exclusive {{user.tier}} rates on {{campaign.destinationType}} stays{{else}}{{campaign.defaultSubheader}}{{/if}}"
}
```

---

## Implementation Steps

### 1. Create Each Campaign
- **Name**: "Hero - [Travel Type] Personalization"
- **Type**: Web Campaign  
- **Page**: Home page (`pageType.equals("home")`)
- **Audience**: Travel preference segments

### 2. Configure Experience
- **Target Element**: `#evergage-hero-zone`
- **Action**: Set Inner HTML + Add Class `evergage-active`
- **Template**: Use the HTML template from previous message
- **Variables**: Set travel-type specific values

### 3. Set Priority & Scheduling
- **Priority**: 100 (high priority for personalization)
- **Schedule**: Always active
- **Frequency**: Show every visit

### 4. A/B Testing Options
Create variants to test:
- Different headline styles
- Various CTA texts
- Alternative background images
- Urgency messaging vs. aspirational messaging

---

## Testing & Analytics

### Events to Track
```javascript
// CTA clicks by travel type
'beachCTAClick', 'mountainCTAClick', 'cityCTAClick', etc.

// Personalization engagement
'personalizedHeroView', 'personalizedHeroCTAClick'

// Conversion tracking
'searchAfterPersonalizedHero', 'bookingFromPersonalizedHero'
```

### Success Metrics
1. **Engagement Rate**: CTA clicks on personalized heroes vs. default
2. **Search Conversion**: Searches initiated after personalized hero
3. **Preference Retention**: Return visitors maintaining same preference
4. **Cross-sell Opportunity**: Users exploring different travel types

---

## Fallback Strategy

### Default Campaign (No Preference Set)
**Trigger**: `!user.travelPreference.exists()`

```javascript
{
  "imageURL": "/images/santorini.jpg",
  "header": "Discover Your Perfect Stay",
  "subheader": "From beaches to mountains, find your ideal getaway",
  "ctaText": "Explore All Destinations",
  "ctaAction": "window.location.href='/destination-type';"
}
```