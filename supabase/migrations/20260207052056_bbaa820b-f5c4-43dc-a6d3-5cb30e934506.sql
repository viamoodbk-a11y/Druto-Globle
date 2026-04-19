-- Auto-approve all location-verified scans that are currently pending
-- These were created before the fix was deployed
UPDATE scans 
SET staff_approved = true 
WHERE staff_approved = false AND location_verified = true;