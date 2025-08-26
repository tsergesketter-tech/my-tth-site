# Salesforce Custom Object Deployment Guide

## Overview
This guide walks you through deploying the Trip Booking custom objects to your Salesforce org and configuring the integration with your TTH booking system.

## Prerequisites
- Salesforce org with Loyalty Management enabled
- Salesforce CLI (sfdx) installed
- Admin access to your Salesforce org
- Connected app configured for API access

## Step 1: Deploy Custom Objects

### Using Salesforce CLI

1. **Authenticate to your org:**
   ```bash
   sf org login web -a YourOrgAlias
   ```

2. **Deploy the custom objects:**
   ```bash
   # Navigate to your project root
   cd /Users/teddysergesketter/my-tth-site
   
   # Deploy objects only (recommended approach)
   sf project deploy start -d salesforce-metadata/objects/ -o YourOrgAlias
   ```

   **Note:** The Apex triggers and classes are optional automation that can be added later. For now, we'll just deploy the objects and handle totals in your application code.

### Using Workbench (Alternative)

1. Zip the contents of the `salesforce-metadata/` folder
2. Go to Workbench (workbench.developerforce.com)
3. Login to your org
4. Go to Migration → Deploy
5. Upload your zip file and deploy

### Using Setup UI (Manual)

If you prefer to create objects manually:

1. **Trip Booking Object (`Trip_Booking__c`):**
   - Go to Setup → Object Manager → Create → Custom Object
   - Use the field specifications from `Trip_Booking__c.object-meta.xml`

2. **Booking Line Item Object (`Booking_Line_Item__c`):**
   - Create as Master-Detail child of Trip Booking
   - Use field specifications from `Booking_Line_Item__c.object-meta.xml`

## Step 2: Configure Permissions

1. **Permission Sets:**
   ```bash
   # Create permission set for booking access
   sf data create record -s PermissionSet -v "Name='Booking_Access' Label='Booking Access'" -o YourOrgAlias
   ```

2. **Object Permissions:**
   - Grant Read, Create, Edit, Delete on `Trip_Booking__c`
   - Grant Read, Create, Edit, Delete on `Booking_Line_Item__c`
   - Assign to API integration user

## Step 3: Environment Configuration

Add these environment variables to your `.env` file:

```bash
# Salesforce Booking Integration
SF_SYNC_BOOKINGS=true
SF_API_VERSION=v64.0

# Existing Salesforce variables (ensure these are set)
SF_CLIENT_ID=your_connected_app_client_id
SF_CLIENT_SECRET=your_connected_app_client_secret
SF_USERNAME=your_integration_user@yourdomain.com
SF_PASSWORD=your_password_plus_security_token
SF_LOGIN_URL=https://login.salesforce.com (or https://test.salesforce.com for sandbox)
SF_LOYALTY_PROGRAM=your_loyalty_program_name
```

## Step 4: Test the Integration

### 1. Build and Start Your Server

```bash
npm run build
npm run dev
```

### 2. Test Booking Creation

```bash
# Test creating a booking
curl -X POST http://localhost:3000/api/bookings \
  -H \"Content-Type: application/json\" \
  -d '{
    \"externalTransactionNumber\": \"TEST-001\",
    \"bookingDate\": \"2024-01-15\",
    \"lineItems\": [{
      \"lob\": \"HOTEL\",
      \"cashAmount\": 299.99,
      \"currency\": \"USD\",
      \"productName\": \"Test Hotel\",
      \"destinationCity\": \"Seattle\"
    }]
  }'
```

### 3. Test Journal Integration

```bash
# Test posting an accrual journal (will create booking if doesn't exist)
curl -X POST http://localhost:3000/api/loyalty/journals/accrual-stay \
  -H \"Content-Type: application/json\" \
  -d '{
    \"ExternalTransactionNumber\": \"TEST-002\",
    \"ActivityDate\": \"2024-01-15T10:00:00Z\",
    \"CurrencyIsoCode\": \"USD\",
    \"TransactionAmount\": 199.99,
    \"Destination_City__c\": \"Chicago\"
  }'
```

### 4. Verify in Salesforce

1. Go to App Launcher → Trip Bookings
2. Check that your test bookings were created
3. Verify line items and totals are correct
4. Check that journal IDs are populated when available

## Step 5: Monitoring and Troubleshooting

### Enable Debug Logging

Add to your server startup:
```bash
DEBUG=bookings:* npm run dev
```

### Common Issues

**1. Authentication Errors:**
- Verify connected app settings
- Check username/password/security token
- Ensure API access is enabled for integration user

**2. Object Not Found:**
- Confirm custom objects were deployed successfully
- Check object API names match exactly
- Verify permissions are assigned

**3. Field Errors:**
- Check field API names and types
- Verify required fields are being populated
- Review validation rule errors

### Monitoring Queries

```sql
-- Check booking sync status
SELECT Id, Name, External_Transaction_Number__c, Last_Sync_Date__c, 
       Booking_Status__c, Created_By_System__c
FROM Trip_Booking__c 
ORDER BY CreatedDate DESC 
LIMIT 10

-- Check line item journal references
SELECT Id, Name, Trip_Booking__r.Name, Line_of_Business__c,
       Redemption_Journal_Id__c, Accrual_Journal_Id__c
FROM Booking_Line_Item__c 
WHERE Trip_Booking__r.External_Transaction_Number__c = 'YOUR_TEST_ID'
```

## Step 6: Optional - Deploy Apex Automation (Later)

If you want automatic calculation of booking totals and status updates, you can deploy the Apex code after confirming the objects work:

```bash
# Deploy Apex automation (optional)
sf project deploy start -d salesforce-metadata/classes/ -o YourOrgAlias
sf project deploy start -d salesforce-metadata/triggers/ -o YourOrgAlias
```

**What the automation provides:**
- Automatic calculation of `Total_Cash_Amount__c`, `Total_Points_Redeemed__c`, etc.
- Automatic booking status updates based on line item states
- Journal reference linking

**Alternative:** Handle these calculations in your Node.js application code instead.

## Step 7: Production Considerations

### Performance
- Consider bulk operations for high-volume scenarios
- Monitor API limits and implement retry logic
- Use efficient SOQL queries in triggers

### Security
- Use dedicated integration user with minimal permissions
- Rotate API credentials regularly
- Monitor API usage and access logs

### Error Handling
- Implement comprehensive error logging
- Set up alerts for sync failures
- Create process for manual reconciliation

### Data Governance
- Establish data retention policies
- Plan for data archival strategies
- Document field mappings and business rules

## API Endpoints Reference

Once deployed, you'll have these endpoints available:

```bash
# Booking Management
GET    /api/bookings                              # List bookings
POST   /api/bookings                              # Create booking
GET    /api/bookings/:id                          # Get booking by ID
GET    /api/bookings/external/:externalId         # Get by external ID
PUT    /api/bookings/:id                          # Update booking
DELETE /api/bookings/:id                          # Delete booking

# Integration Endpoints
POST   /api/bookings/:id/journal-ids              # Update journal IDs
POST   /api/bookings/:id/cancel                   # Cancel line items

# Query Parameters
?source=salesforce                                # Try Salesforce first
?summary=true                                     # Return lightweight summaries
```

## Next Steps: Cancellation Workflow

With the booking objects deployed, you can now implement the cancellation workflow:

1. **Create cancellation service** that uses Salesforce's journal cancellation APIs
2. **Build cancellation UI** that shows bookings and allows partial/full cancellation
3. **Implement refund processing** with proper priority (points first, then cash)
4. **Add reporting and analytics** using Salesforce reports and dashboards

The foundation is now in place to support your complete travel booking and loyalty program integration!