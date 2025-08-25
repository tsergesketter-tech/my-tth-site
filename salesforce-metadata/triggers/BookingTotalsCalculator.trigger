trigger BookingTotalsCalculator on Booking_Line_Item__c (after insert, after update, after delete, after undelete) {
    // Collect booking IDs that need totals recalculated
    Set<Id> bookingIds = new Set<Id>();
    
    // Handle different trigger contexts
    if (Trigger.isInsert || Trigger.isUpdate || Trigger.isUndelete) {
        for (Booking_Line_Item__c lineItem : Trigger.new) {
            bookingIds.add(lineItem.Trip_Booking__c);
        }
    }
    
    if (Trigger.isUpdate || Trigger.isDelete) {
        for (Booking_Line_Item__c lineItem : Trigger.old) {
            bookingIds.add(lineItem.Trip_Booking__c);
        }
    }
    
    if (!bookingIds.isEmpty()) {
        BookingTotalsCalculatorHelper.recalculateBookingTotals(bookingIds);
    }
}