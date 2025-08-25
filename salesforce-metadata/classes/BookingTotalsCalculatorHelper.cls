public class BookingTotalsCalculatorHelper {
    
    /**
     * Recalculate totals for the specified booking records
     */
    public static void recalculateBookingTotals(Set<Id> bookingIds) {
        if (bookingIds.isEmpty()) return;
        
        // Query all line items for the affected bookings
        Map<Id, List<Booking_Line_Item__c>> bookingToLineItems = new Map<Id, List<Booking_Line_Item__c>>();
        
        for (Booking_Line_Item__c lineItem : [
            SELECT Id, Trip_Booking__c, Line_Item_Status__c, Cash_Amount__c, 
                   Taxes__c, Fees__c, Points_Redeemed__c
            FROM Booking_Line_Item__c 
            WHERE Trip_Booking__c IN :bookingIds
        ]) {
            if (!bookingToLineItems.containsKey(lineItem.Trip_Booking__c)) {
                bookingToLineItems.put(lineItem.Trip_Booking__c, new List<Booking_Line_Item__c>());
            }
            bookingToLineItems.get(lineItem.Trip_Booking__c).add(lineItem);
        }
        
        // Calculate totals and determine booking status
        List<Trip_Booking__c> bookingsToUpdate = new List<Trip_Booking__c>();
        
        for (Id bookingId : bookingIds) {
            List<Booking_Line_Item__c> lineItems = bookingToLineItems.get(bookingId);
            if (lineItems == null) lineItems = new List<Booking_Line_Item__c>();
            
            BookingTotals totals = calculateTotals(lineItems);
            String newStatus = determineBookingStatus(lineItems);
            
            Trip_Booking__c booking = new Trip_Booking__c(
                Id = bookingId,
                Total_Cash_Amount__c = totals.totalCash,
                Total_Taxes_And_Fees__c = totals.totalTaxesAndFees,
                Total_Points_Redeemed__c = totals.totalPointsRedeemed,
                Booking_Status__c = newStatus,
                Last_Sync_Date__c = System.now()
            );
            
            bookingsToUpdate.add(booking);
        }
        
        if (!bookingsToUpdate.isEmpty()) {
            try {
                update bookingsToUpdate;
            } catch (Exception e) {
                System.debug('Error updating booking totals: ' + e.getMessage());
                // In production, you might want to create error logs or send notifications
            }
        }
    }
    
    /**
     * Calculate financial totals from line items
     */
    private static BookingTotals calculateTotals(List<Booking_Line_Item__c> lineItems) {
        BookingTotals totals = new BookingTotals();
        
        for (Booking_Line_Item__c lineItem : lineItems) {
            // Only include active items in totals
            if (lineItem.Line_Item_Status__c == 'ACTIVE') {
                totals.totalCash += (lineItem.Cash_Amount__c != null ? lineItem.Cash_Amount__c : 0);
                totals.totalTaxesAndFees += (lineItem.Taxes__c != null ? lineItem.Taxes__c : 0);
                totals.totalTaxesAndFees += (lineItem.Fees__c != null ? lineItem.Fees__c : 0);
                totals.totalPointsRedeemed += (lineItem.Points_Redeemed__c != null ? lineItem.Points_Redeemed__c : 0);
            }
        }
        
        return totals;
    }
    
    /**
     * Determine booking status based on line item statuses
     */
    private static String determineBookingStatus(List<Booking_Line_Item__c> lineItems) {
        if (lineItems.isEmpty()) {
            return 'FULLY_CANCELLED';
        }
        
        Integer activeCount = 0;
        Integer cancelledCount = 0;
        Integer cancellingCount = 0;
        
        for (Booking_Line_Item__c lineItem : lineItems) {
            if (lineItem.Line_Item_Status__c == 'ACTIVE') {
                activeCount++;
            } else if (lineItem.Line_Item_Status__c == 'CANCELLED') {
                cancelledCount++;
            } else if (lineItem.Line_Item_Status__c == 'CANCELLING') {
                cancellingCount++;
            }
        }
        
        // If any items are in cancelling status, booking is pending cancellation
        if (cancellingCount > 0) {
            return 'PENDING_CANCELLATION';
        }
        
        // If no active items, fully cancelled
        if (activeCount == 0) {
            return 'FULLY_CANCELLED';
        }
        
        // If some cancelled and some active, partially cancelled
        if (cancelledCount > 0 && activeCount > 0) {
            return 'PARTIALLY_CANCELLED';
        }
        
        // Otherwise, active
        return 'ACTIVE';
    }
    
    /**
     * Helper class to hold calculated totals
     */
    private class BookingTotals {
        public Decimal totalCash = 0;
        public Decimal totalTaxesAndFees = 0;
        public Decimal totalPointsRedeemed = 0;
    }
    
    /**
     * Update journal references when journal IDs are populated
     * Called from external integration code
     */
    public static void updateJournalReferences(Set<Id> lineItemIds) {
        List<Booking_Line_Item__c> lineItemsToUpdate = new List<Booking_Line_Item__c>();
        
        for (Booking_Line_Item__c lineItem : [
            SELECT Id, Redemption_Journal_Id__c, Accrual_Journal_Id__c,
                   Redemption_Journal__c, Accrual_Journal__c
            FROM Booking_Line_Item__c 
            WHERE Id IN :lineItemIds
            AND (Redemption_Journal_Id__c != null OR Accrual_Journal_Id__c != null)
        ]) {
            Boolean needsUpdate = false;
            Booking_Line_Item__c updateItem = new Booking_Line_Item__c(Id = lineItem.Id);
            
            // Update redemption journal lookup if ID is provided but lookup is empty
            if (String.isNotBlank(lineItem.Redemption_Journal_Id__c) && lineItem.Redemption_Journal__c == null) {
                updateItem.Redemption_Journal__c = lineItem.Redemption_Journal_Id__c;
                needsUpdate = true;
            }
            
            // Update accrual journal lookup if ID is provided but lookup is empty
            if (String.isNotBlank(lineItem.Accrual_Journal_Id__c) && lineItem.Accrual_Journal__c == null) {
                updateItem.Accrual_Journal__c = lineItem.Accrual_Journal_Id__c;
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                lineItemsToUpdate.add(updateItem);
            }
        }
        
        if (!lineItemsToUpdate.isEmpty()) {
            try {
                update lineItemsToUpdate;
            } catch (Exception e) {
                System.debug('Error updating journal references: ' + e.getMessage());
            }
        }
    }
}