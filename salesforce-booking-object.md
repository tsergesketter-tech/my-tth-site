# Salesforce Booking Custom Object Design

## Overview
Create a custom object in Salesforce to store booking information and provide better integration with the loyalty program. This will enable:
- Better tracking of bookings and their associated journals
- Improved reporting and analytics
- Support for the cancellation workflow
- Integration with Salesforce processes

## Custom Object: Trip_Booking__c

### Core Fields

| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Name | Auto Number | TBK-{0000} | Yes | Auto-generated booking number |
| External_Transaction_Number__c | Text | 100 | Yes | External booking ID from your system |
| Booking_Status__c | Picklist | - | Yes | ACTIVE, PARTIALLY_CANCELLED, FULLY_CANCELLED, PENDING_CANCELLATION |

### Member Information
| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Loyalty_Program_Member__c | Lookup | - | No | Reference to LoyaltyProgramMember |
| Member_Id__c | Text | 18 | No | Salesforce Member ID |
| Membership_Number__c | Text | 50 | No | Program membership number |

### Booking Details
| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Booking_Date__c | Date | - | Yes | When booking was made |
| Trip_Start_Date__c | Date | - | No | Overall trip start date |
| Trip_End_Date__c | Date | - | No | Overall trip end date |
| Channel__c | Text | 50 | No | Web, Mobile, Agent, etc. |
| POS__c | Text | 10 | No | Point of sale agency |
| Payment_Method__c | Text | 50 | No | Credit card, etc. |

### Financial Totals (Formula/Rollup fields)
| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Total_Cash_Amount__c | Currency | - | No | Sum of all line item cash amounts |
| Total_Taxes_And_Fees__c | Currency | - | No | Sum of all line item taxes and fees |
| Total_Points_Redeemed__c | Number | - | No | Sum of all line item points redeemed |
| Total_Points_Earned__c | Number | - | No | Sum of points from accrual journals |

### System Fields
| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Internal_Booking_Id__c | Text | 100 | No | UUID from your local system |
| Created_By_System__c | Text | 50 | No | Which system created this booking |
| Notes__c | Long Text | 2000 | No | Additional notes |
| Last_Sync_Date__c | DateTime | - | No | Last sync with external system |

## Child Object: Booking_Line_Item__c

### Core Fields
| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Name | Auto Number | LI-{0000} | Yes | Auto-generated line item number |
| Trip_Booking__c | Master-Detail | - | Yes | Parent booking |
| Line_of_Business__c | Picklist | - | Yes | FLIGHT, HOTEL, CAR, PACKAGE |
| Line_Item_Status__c | Picklist | - | Yes | ACTIVE, CANCELLED, CANCELLING |

### Product Information
| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Product_Name__c | Text | 255 | No | Hotel name, airline, etc. |
| Product_Code__c | Text | 100 | No | Hotel code, flight number, etc. |
| Destination_City__c | Text | 100 | No | City |
| Destination_Country__c | Text | 100 | No | Country |
| Start_Date__c | Date | - | No | Service start date |
| End_Date__c | Date | - | No | Service end date |
| Nights__c | Number | - | No | Number of nights (hotels) |

### Financial Information
| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Cash_Amount__c | Currency | - | No | Cash amount for this line item |
| Points_Redeemed__c | Number | - | No | Points redeemed for this line item |
| Currency_Code__c | Text | 3 | No | Currency ISO code |
| Taxes__c | Currency | - | No | Taxes for this line item |
| Fees__c | Currency | - | No | Fees for this line item |

### Journal Tracking
| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Redemption_Journal__c | Lookup | - | No | Reference to TransactionJournal |
| Accrual_Journal__c | Lookup | - | No | Reference to TransactionJournal |
| Redemption_Journal_Id__c | Text | 18 | No | Salesforce ID of redemption journal |
| Accrual_Journal_Id__c | Text | 18 | No | Salesforce ID of accrual journal |

### Cancellation Tracking
| API Name | Type | Length | Required | Description |
|----------|------|---------|----------|-------------|
| Cancelled_Date__c | DateTime | - | No | When this item was cancelled |
| Cancellation_Reason__c | Text | 255 | No | Why it was cancelled |
| Cancelled_By__c | Text | 100 | No | Who cancelled it |

## Integration Design

### 1. Creating Bookings
When your system creates a booking record locally:
1. Post the booking to Salesforce via REST API
2. Store the returned Salesforce ID in your local booking record
3. Use the Salesforce ID for future updates

### 2. Journal Integration
When journals are posted:
1. Lookup the Salesforce booking by External_Transaction_Number__c
2. Find the appropriate line item by LOB
3. Update the line item with the returned journal IDs
4. Update totals on the parent booking (via triggers/processes)

### 3. Cancellation Integration
When cancellations occur:
1. Lookup the Salesforce booking
2. Update line item status to CANCELLED
3. Use Salesforce's built-in journal cancellation APIs
4. Update booking status based on remaining active items

## Salesforce Configuration

### Triggers/Processes Needed
1. **Booking Rollup Trigger**: Calculate totals from line items
2. **Status Update Process**: Update booking status when line items change
3. **Journal Sync Process**: Keep journal references updated

### Reports & Dashboards
1. **Booking Summary Report**: All bookings with totals and status
2. **Cancellation Analysis**: Track cancellation rates and reasons  
3. **Revenue Dashboard**: Cash vs points usage trends
4. **LOB Performance**: Performance by line of business

### Validation Rules
1. Ensure at least one active line item per booking
2. Validate date ranges (trip end >= trip start)
3. Ensure currency consistency within a booking
4. Validate status transitions

## API Integration Example

```typescript
// Create booking in Salesforce
export async function createSalesforceBooking(booking: TripBooking) {
  const { access_token, instance_url } = await getClientCredentialsToken();
  
  const bookingRecord = {
    External_Transaction_Number__c: booking.externalTransactionNumber,
    Member_Id__c: booking.memberId,
    Membership_Number__c: booking.membershipNumber,
    Booking_Date__c: booking.bookingDate,
    Trip_Start_Date__c: booking.tripStartDate,
    Trip_End_Date__c: booking.tripEndDate,
    Channel__c: booking.channel,
    POS__c: booking.posa,
    Payment_Method__c: booking.paymentMethod,
    Booking_Status__c: booking.status,
    Internal_Booking_Id__c: booking.id,
    Created_By_System__c: 'TTH-Booking-System',
    Notes__c: booking.notes
  };
  
  const response = await fetch(`${instance_url}/services/data/v64.0/sobjects/Trip_Booking__c`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingRecord)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create Salesforce booking: ${response.status}`);
  }
  
  const result = await response.json();
  const salesforceId = result.id;
  
  // Create line items
  for (const lineItem of booking.lineItems) {
    await createSalesforceLineItem(salesforceId, lineItem);
  }
  
  return salesforceId;
}

async function createSalesforceLineItem(bookingId: string, lineItem: BookingLineItem) {
  const { access_token, instance_url } = await getClientCredentialsToken();
  
  const lineItemRecord = {
    Trip_Booking__c: bookingId,
    Line_of_Business__c: lineItem.lob,
    Line_Item_Status__c: lineItem.status,
    Product_Name__c: lineItem.productName,
    Product_Code__c: lineItem.productCode,
    Cash_Amount__c: lineItem.cashAmount,
    Points_Redeemed__c: lineItem.pointsRedeemed,
    Currency_Code__c: lineItem.currency,
    Taxes__c: lineItem.taxes,
    Fees__c: lineItem.fees,
    Destination_City__c: lineItem.destinationCity,
    Destination_Country__c: lineItem.destinationCountry,
    Start_Date__c: lineItem.startDate?.split('T')[0],
    End_Date__c: lineItem.endDate?.split('T')[0],
    Nights__c: lineItem.nights
  };
  
  const response = await fetch(`${instance_url}/services/data/v64.0/sobjects/Booking_Line_Item__c`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(lineItemRecord)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create Salesforce line item: ${response.status}`);
  }
  
  return response.json();
}
```

## Benefits
1. **Unified View**: All booking data in Salesforce alongside loyalty data
2. **Better Reporting**: Rich analytics and dashboards
3. **Cancellation Support**: Structured tracking of cancellations and refunds
4. **Process Automation**: Salesforce workflows can handle complex business rules
5. **Data Integrity**: Validation rules ensure data quality
6. **Scalability**: Leverages Salesforce's enterprise platform capabilities