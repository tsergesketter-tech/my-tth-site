// server/src/salesforce/journalBookingLink.ts
// Integration to link TransactionJournals with BookingLineItems

import { getClientCredentialsToken } from "./auth";

const DEFAULT_API_VERSION = process.env.SF_API_VERSION || "v64.0";

export type JournalLinkResult = {
  ok: boolean;
  status: number;
  body: any;
  error?: string;
};

/**
 * Update a TransactionJournal with booking line item reference and metadata
 */
export async function linkJournalToBookingLineItem(
  journalId: string,
  internalLineItemId: string,
  externalTransactionNumber: string,
  lineOfBusiness: string,
  memberId?: string
): Promise<JournalLinkResult> {
  try {
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    // First, find the Salesforce ID for the booking line item
    const queryUrl = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(
      `SELECT Id FROM Booking_Line_Item__c WHERE Internal_Line_Item_Id__c = '${internalLineItemId}' LIMIT 1`
    )}`;
    
    const queryResponse = await fetch(queryUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const queryResult = await queryResponse.json();
    
    if (!queryResponse.ok || !queryResult.records?.length) {
      return {
        ok: false,
        status: 404,
        body: queryResult,
        error: 'Booking line item not found in Salesforce'
      };
    }
    
    const salesforceLineItemId = queryResult.records[0].Id;
    
    const updateData = {
      Booking_Line_Item__c: salesforceLineItemId,
      ExternalTransactionNumber: externalTransactionNumber,
      Line_of_Business__c: lineOfBusiness.toUpperCase(),
    };
    
    console.log(`[journal-link] Linking journal ${journalId} to line item ${salesforceLineItemId}`, updateData);
    
    const response = await fetch(`${instance_url}/services/data/${DEFAULT_API_VERSION}/sobjects/TransactionJournal/${journalId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const result = await response.json();
      console.error('[journal-link] Failed to link journal:', result);
      return {
        ok: false,
        status: response.status,
        body: result,
        error: result.message || result[0]?.message || `HTTP ${response.status}`
      };
    }
    
    console.log(`[journal-link] Successfully linked journal ${journalId} to booking line item ${salesforceLineItemId}`);
    
    return {
      ok: true,
      status: response.status,
      body: { message: 'Journal successfully linked to booking line item' }
    };
    
  } catch (error: any) {
    console.error('[journal-link] Error linking journal:', error);
    return {
      ok: false,
      status: 500,
      body: {},
      error: error.message || String(error)
    };
  }
}

/**
 * Query TransactionJournals linked to a specific booking line item
 */
export async function getJournalsForLineItem(lineItemId: string): Promise<any[]> {
  try {
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    const query = `SELECT Id, JournalTypeName, JournalSubTypeName, ActivityDate, PointsChange, TransactionAmount, 
                          External_Transaction_Number__c, Line_of_Business__c, MemberId 
                   FROM TransactionJournal 
                   WHERE Booking_Line_Item__c = '${lineItemId}'
                   ORDER BY ActivityDate DESC`;
    
    const queryUrl = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(queryUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[journal-link] Failed to query journals:', result);
      throw new Error(result.message || result[0]?.message || `HTTP ${response.status}`);
    }
    
    return result.records || [];
    
  } catch (error: any) {
    console.error('[journal-link] Error querying journals for line item:', error);
    throw error;
  }
}

/**
 * Query all journals for a booking (across all line items)
 */
export async function getJournalsForBooking(externalTransactionNumber: string): Promise<any[]> {
  try {
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    const query = `SELECT Id, JournalTypeName, JournalSubTypeName, ActivityDate, PointsChange, TransactionAmount,
                          External_Transaction_Number__c, Line_of_Business__c, MemberId,
                          Booking_Line_Item__r.Line_of_Business__c, Booking_Line_Item__r.Product_Name__c
                   FROM TransactionJournal 
                   WHERE External_Transaction_Number__c = '${externalTransactionNumber}'
                   ORDER BY ActivityDate DESC, Line_of_Business__c`;
    
    const queryUrl = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(queryUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[journal-link] Failed to query booking journals:', result);
      throw new Error(result.message || result[0]?.message || `HTTP ${response.status}`);
    }
    
    return result.records || [];
    
  } catch (error: any) {
    console.error('[journal-link] Error querying journals for booking:', error);
    throw error;
  }
}