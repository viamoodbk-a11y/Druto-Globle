

# Multi-Branch Subscription Plans

## Overview
Add three subscription tiers (1-store, 3-store, 6-store) with GPS-based branch detection using the same QR code. Owners on multi-store plans can add branch locations and see which branch each scan came from.

## Pricing Tiers

| Plan | Price | Razorpay Plan ID | Max Branches |
|------|-------|-----------------|--------------|
| Starter (current) | 229/mo | plan_SGMz3aZbgxgcBy | 1 |
| Growth (3 stores) | 499/mo | plan_SGPdRGGKwsGCpN | 3 |
| Pro (6 stores) | 999/mo | plan_SGPdx1HD4uPPQn | 6 |
| Enterprise | Contact us | N/A | Unlimited |

## Database Changes

### 1. Add `plan_tier` column to `subscriptions` table
- Values: `starter`, `growth`, `pro`, `enterprise`
- Default: `starter`

### 2. Create `branches` table
- `id` (uuid, PK)
- `restaurant_id` (uuid, FK to restaurants)
- `name` (text) -- e.g. "Koramangala Branch"
- `address` (text)
- `city` (text)
- `latitude` (double precision)
- `longitude` (double precision)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`
- RLS: owners can manage their own branches (via restaurant owner_id)

### 3. Add `branch_id` column to `scans` table
- Nullable uuid referencing `branches.id`
- When a scan happens, the system matches the customer's GPS to the nearest branch

## Edge Function Changes

### `process-scan` update
- After finding the restaurant, fetch all active branches for that restaurant
- Compare customer GPS against each branch location (+ the main restaurant location)
- Pick the closest one within the distance threshold
- Store the matched `branch_id` in the scan record
- If no branch matches but the main restaurant location matches, leave `branch_id` null (main location)

### `razorpay-create-subscription` update
- Accept a `planTier` parameter (`starter`, `growth`, `pro`)
- Map tier to the correct Razorpay Plan ID
- Store `plan_tier` in the subscriptions table

### `razorpay-webhook` update
- Preserve the `plan_tier` when updating subscription status on payment events

## Frontend Changes

### 1. New Pricing Page (`src/pages/Pricing.tsx`)
- Three pricing cards side by side (Starter, Growth, Pro) + Enterprise "Contact Us"
- Each card lists features and branch limits
- "Subscribe" button initiates Razorpay checkout with the selected plan
- Route: `/pricing`

### 2. Home Page (`src/pages/Index.tsx`)
- Replace the single "Starter Plan 229/mo" card with a mini pricing comparison
- Add a "View All Plans" link to `/pricing`

### 3. Subscription Banner (`src/components/SubscriptionGate.tsx`)
- Update the "Subscribe Now -- 229/month" text to "Plans from 229/month"
- Link to `/pricing` page instead of inline checkout

### 4. Owner Profile -- Branch Management (`src/pages/OwnerProfile.tsx`)
- New "Branches" section (only visible if plan tier is `growth`, `pro`, or `enterprise`)
- List existing branches with name, address, edit/delete
- "Add Branch" button with address search (reuses `OlaMapSearch`)
- Show branch count vs. limit (e.g. "2/3 branches used")

### 5. Owner Dashboard -- Scan Analytics by Branch
- In the OverviewTab, show which branch each scan came from
- Add a branch filter/breakdown in the stats section
- In CustomersTab, show branch name next to each scan entry

### 6. `useRazorpayCheckout` hook
- Accept `planTier` parameter
- Pass it to `razorpay-create-subscription`
- Update description text based on tier

### 7. `useSubscription` hook
- Return `planTier` and `maxBranches` based on tier

## Technical Details

### Branch-GPS matching logic (in `process-scan`)
```text
1. Fetch branches WHERE restaurant_id = scanned restaurant AND is_active = true
2. Calculate distance from customer GPS to each branch + main restaurant
3. Find the closest location within threshold (50m default)
4. If closest is a branch, set branch_id on the scan
5. If closest is main restaurant, leave branch_id null
6. If none within range, reject scan (existing behavior)
```

### Plan tier to branch limit mapping
```text
starter    -> 1 (main location only, no branches)
growth     -> 3 (main + 2 additional)
pro        -> 6 (main + 5 additional)
enterprise -> unlimited
```

### New route in App.tsx
```text
/pricing -> Pricing page (public, no auth required)
```

## Implementation Order
1. Database migration (add plan_tier, create branches table, add branch_id to scans)
2. Update edge functions (process-scan, razorpay-create-subscription, webhook)
3. Create Pricing page
4. Update Home page pricing section
5. Update SubscriptionGate/Banner to link to pricing
6. Add branch management to Owner Profile
7. Update Owner Dashboard to show branch data in scans
8. Update useSubscription and useRazorpayCheckout hooks