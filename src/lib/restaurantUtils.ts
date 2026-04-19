/**
 * Utility functions for restaurant data mapping and categorization
 */

export interface Reward {
    id: string;
    name: string;
    description: string;
    stampsRequired: number;
    expiryDays: number | null;
    rewardImageUrl: string | null;
    icon: string;
}

export interface RestaurantData {
    id: string;
    name: string;
    slug: string;
    icon: string;
    category: string;
    address: string | null;
    phone: string | null;
    website: string | null;
    rating: number;
    reward: string;
    rewardDescription: string;
    rewardImageUrl: string | null;
    totalRequired: number;
    userVisits: number;
    visitHistory: { date: string; time: string }[];
    hours: string;
    isOpen: boolean;
    logoUrl: string | null;
    googleReviewUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    pendingScans: number;
    socialLinks?: { instagram?: string; facebook?: string; youtube?: string; google_review_text?: string } | null;
    openingHours?: any | null;
    activeLoyaltyCardId?: string | null;
    allRewards: Reward[];
    unredeemedRewards?: any[];
}

export const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
        cafe: "☕",
        restaurant: "🍽️",
        bakery: "🥐",
        bar: "🍺",
        ice_cream: "🍦",
        salon: "💇",
        gym: "🏋️",
        car_wash: "🚗",
        jewelry: "💎",
        pet_store: "🐾",
        bookstore: "📚",
        clothing: "👗",
        electronics: "📱",
        pharmacy: "💊",
        grocery: "🛒",
        retail: "🛍️",
        other: "📦",
    };
    return icons[category] || "🏪";
};

const parseReward = (r: any): Reward => {
    let icon = "🎁";
    let description = r.description || "";
    if (description.startsWith("[icon:")) {
        const match = description.match(/^\[icon:(.*?)\](.*)$/);
        if (match) {
            icon = match[1];
            description = match[2];
        }
    }
    return {
        id: r.id,
        name: r.name,
        description,
        stampsRequired: r.stamps_required,
        expiryDays: r.expiry_days,
        rewardImageUrl: r.reward_image_url,
        icon,
    };
};

export const mapRestaurantData = (data: any): RestaurantData => {
    const allRewards = (data.rewards || []).map(parseReward);
    const primaryReward = allRewards[0];

    return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        icon: getCategoryIcon(data.category || "other"),
        category: data.category || "Other",
        address: data.address,
        phone: data.phone,
        website: data.website,
        rating: data.rating || 4.5,
        reward: primaryReward?.name || "Loyalty Reward",
        rewardDescription: primaryReward?.description || "Complete your card to earn a reward",
        rewardImageUrl: primaryReward?.rewardImageUrl || null,
        totalRequired: primaryReward?.stampsRequired || 10,
        userVisits: data.userVisits || 0,
        visitHistory: data.visitHistory || [],
        hours: "Open now",
        isOpen: data.is_active || false,
        logoUrl: data.logo_url,
        googleReviewUrl: data.google_review_url || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        city: data.city || null,
        pendingScans: data.pendingScans || 0,
        socialLinks: data.social_links || null,
        openingHours: data.opening_hours || null,
        allRewards,
        unredeemedRewards: data.unredeemedRewards || [],
        activeLoyaltyCardId: data.activeLoyaltyCardId || null,
    };
};
