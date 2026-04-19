-- Migration to add native device tokens for FCM/APNs support
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS device_token text,
ADD COLUMN IF NOT EXISTS token_type text DEFAULT 'fcm';

-- Add index for device_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_device_token ON profiles(device_token);
