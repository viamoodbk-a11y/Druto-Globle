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
    openingHours?: { open?: string; close?: string } | null;
}

export const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
        cafe: "☕",
        restaurant: "🍽️",
        bakery: "🥐",
        bar: "🍺",
        salon: "💇",
        gym: "🏋️",
        retail: "🛍️",
        other: "📦",
    };
    return icons[category] || "🏪";
};

export const mapRestaurantData = (data: any): RestaurantData => {
    const reward = data.rewards?.[0];
    return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        icon: getCategoryIcon(data.category?.toLowerCase() || "cafe"),
        category: data.category || "Café",
        address: data.address,
        phone: data.phone,
        website: data.website,
        rating: data.rating || 4.5,
        reward: reward?.name || "Loyalty Reward",
        rewardDescription: reward?.description || "Complete your card to earn a reward",
        rewardImageUrl: reward?.reward_image_url || null,
        totalRequired: reward?.stamps_required || 10,
        userVisits: data.userVisits || 0,
        visitHistory: data.visitHistory || [],
        hours: "Open now",
        isOpen: data.is_active !== false,
        logoUrl: data.logo_url,
        googleReviewUrl: data.google_review_url || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        city: data.city || null,
        pendingScans: data.pendingScans || 0,
        socialLinks: data.social_links || null,
        openingHours: data.opening_hours || null,
    };
};
