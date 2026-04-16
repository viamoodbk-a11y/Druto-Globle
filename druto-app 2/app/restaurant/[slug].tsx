import React, { useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    MapPin,
    Clock,
    Phone,
    ChevronLeft,
    Gift,
    Check,
    Star,
    Instagram,
    ChevronRight,
    QrCode,
} from 'lucide-react-native';
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail';

const PRIMARY = '#900A12';

export default function RestaurantDetailScreen() {
    const { slug, initialData } = useLocalSearchParams();
    const router = useRouter();
    const { data: restaurant, isLoading, refetch, isError } = useRestaurantDetail(slug as string);

    const parsedInitial = React.useMemo(() => {
        if (!initialData) return null;
        try {
            return JSON.parse(decodeURIComponent(initialData as string));
        } catch (e) {
            return null;
        }
    }, [initialData]);

    const displayData = restaurant || parsedInitial;

    const handleRefresh = useCallback(async () => {
        await refetch();
    }, [refetch]);

    if (isLoading && !displayData) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <View
                    style={{
                        backgroundColor: PRIMARY,
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
                        paddingHorizontal: 20,
                        paddingTop: 56,
                        paddingBottom: 32,
                        height: 250,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            marginBottom: 20,
                            height: 40,
                            width: 40,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <ActivityIndicator size="large" color="white" style={{ marginTop: 20 }} />
                </View>
            </View>
        );
    }

    if (!isLoading && (isError || !displayData)) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', padding: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Restaurant not found</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 }}
                >
                    <Text style={{ color: 'white', fontWeight: '700' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const safeData = displayData || {} as any;
    const totalRequired = safeData.totalRequired || 10;
    const userVisits = safeData.userVisits || 0;

    const stamps = Array.from({ length: totalRequired }, (_, i) => i < userVisits);
    const remaining = Math.max(0, totalRequired - userVisits);
    const progressPct = Math.min(1, userVisits / Math.max(1, totalRequired));

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <ScrollView
                style={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={PRIMARY} />}
            >
                {/* Hero Header */}
                <View
                    style={{
                        backgroundColor: PRIMARY,
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
                        paddingHorizontal: 20,
                        paddingTop: 56,
                        paddingBottom: 32,
                    }}
                >
                    {/* Back button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            marginBottom: 20,
                            height: 40,
                            width: 40,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>

                    {/* Restaurant info row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <View
                            style={{
                                height: 80,
                                width: 80,
                                borderRadius: 24,
                                backgroundColor: 'white',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            {safeData.logoUrl ? (
                                <Image source={{ uri: safeData.logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                                <Text style={{ fontSize: 32 }}>{safeData.icon || '🏪'}</Text>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 22, fontWeight: '700', color: 'white', lineHeight: 27 }}>{safeData.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <Star size={12} color="white" fill="white" />
                                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '700', marginLeft: 4 }}>
                                    {safeData.rating || 4.5}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Premium Partner ✓
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Stamp Progress */}
                    <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 20 }}>
                                {userVisits} / {totalRequired} Stamps
                            </Text>
                            {remaining > 0 ? (
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' }}>
                                    {remaining} more to go!
                                </Text>
                            ) : (
                                <Text style={{ color: '#86EFAC', fontSize: 13, fontWeight: '700' }}>Completed! 🎉</Text>
                            )}
                        </View>
                        <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                            <View
                                style={{
                                    height: '100%',
                                    width: `${progressPct * 100}%`,
                                    backgroundColor: 'white',
                                    borderRadius: 10,
                                }}
                            />
                        </View>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 12 }}>
                    {/* Unredeemed Rewards / Pending Rewards */}
                    {safeData.unredeemedRewards && safeData.unredeemedRewards.length > 0 && (
                        <View style={{ gap: 10 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginLeft: 4 }}>
                                You have pending rewards! 🎁
                            </Text>
                            {safeData.unredeemedRewards.map((item: any) => (
                                <View
                                    key={item.id}
                                    style={{
                                        backgroundColor: '#ECFDF5',
                                        borderRadius: 20,
                                        padding: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: '#10B981',
                                        shadowColor: '#10B981',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    <View
                                        style={{
                                            height: 56,
                                            width: 56,
                                            borderRadius: 14,
                                            backgroundColor: '#D1FAE5',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {item.reward?.reward_image_url ? (
                                            <Image source={{ uri: item.reward.reward_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        ) : (
                                            <Gift size={28} color="#059669" />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#064E3B' }}>
                                            {item.reward?.name || 'Loyalty Reward'}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                                            Earned on {new Date(item.claimed_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => alert('Show this screen to the staff at the counter to claim your reward!')}
                                        style={{
                                            backgroundColor: '#10B981',
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            borderRadius: 10,
                                        }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Claim</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Next Reward Card */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 20,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.06,
                            shadowRadius: 8,
                            elevation: 3,
                            borderWidth: 1,
                            borderColor: '#F3F4F6',
                        }}
                    >
                        <View
                            style={{
                                height: 64,
                                width: 64,
                                borderRadius: 16,
                                backgroundColor: `${PRIMARY}10`,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}
                        >
                            {safeData.rewardImageUrl ? (
                                <Image source={{ uri: safeData.rewardImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                                <Text style={{ fontSize: 28 }}>🎁</Text>
                            )}
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text
                                style={{ fontSize: 10, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}
                            >
                                Next Reward
                            </Text>
                            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
                                {safeData.reward || 'Free Reward'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                {remaining > 0 ? `Collect ${remaining} more stamps` : 'Ready to redeem!'}
                            </Text>
                        </View>
                    </View>

                    {/* Stamp Card Grid */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 20,
                            padding: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.06,
                            shadowRadius: 8,
                            elevation: 3,
                            borderWidth: 1,
                            borderColor: '#F3F4F6',
                        }}
                    >
                        <Text
                            style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}
                        >
                            Stamp Card
                        </Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
                            {stamps.map((filled, i) => (
                                <View
                                    key={i}
                                    style={{
                                        height: 52,
                                        width: 52,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: filled ? PRIMARY : 'transparent',
                                        borderWidth: 2,
                                        borderStyle: filled ? 'solid' : 'dashed',
                                        borderColor: filled ? PRIMARY : `${PRIMARY}33`,
                                    }}
                                >
                                    {filled ? (
                                        <Check size={26} color="white" strokeWidth={3} />
                                    ) : i === totalRequired - 1 ? (
                                        <Gift size={18} color={`${PRIMARY}4D`} />
                                    ) : null}
                                </View>
                            ))}
                        </View>

                        {/* Pending scans banner */}
                        {safeData.pendingScans > 0 && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: `${PRIMARY}10`,
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 14,
                                    borderWidth: 1,
                                    borderColor: `${PRIMARY}30`,
                                    gap: 10,
                                }}
                            >
                                <ActivityIndicator size="small" color={PRIMARY} />
                                <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {safeData.pendingScans} visit pending staff approval
                                </Text>
                            </View>
                        )}

                        {/* Claim Reward Button */}
                        {remaining === 0 && (
                            <TouchableOpacity
                                onPress={() => alert('Show this screen to the staff at the counter to claim your reward!')}
                                style={{
                                    backgroundColor: '#16A34A',
                                    borderRadius: 16,
                                    paddingVertical: 16,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 8,
                                    shadowColor: '#16A34A',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}
                            >
                                <Gift size={20} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Claim Your Reward</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Social Links (Moved Above Business Details) */}
                    {(safeData.socialLinks?.instagram || safeData.googleReviewUrl) && (
                        <View
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 20,
                                padding: 20,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.06,
                                shadowRadius: 8,
                                elevation: 3,
                                borderWidth: 1,
                                borderColor: '#F3F4F6',
                            }}
                        >
                            <Text
                                style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}
                            >
                                Connect & Review
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                {safeData.socialLinks?.instagram && (
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(safeData.socialLinks!.instagram!)}
                                        style={{
                                            height: 48,
                                            width: 48,
                                            borderRadius: 16,
                                            backgroundColor: '#FEE2F8',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Instagram size={24} color="#E1306C" />
                                    </TouchableOpacity>
                                )}
                                {safeData.googleReviewUrl && (
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(safeData.googleReviewUrl!)}
                                        style={{
                                            height: 48,
                                            paddingHorizontal: 16,
                                            borderRadius: 16,
                                            backgroundColor: '#111827',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexDirection: 'row',
                                            gap: 8,
                                        }}
                                    >
                                        <Star size={18} color="#FBBF24" fill="#FBBF24" />
                                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                                            {safeData.socialLinks?.google_review_text || 'Review us on Google'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Business Details */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 20,
                            padding: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.06,
                            shadowRadius: 8,
                            elevation: 3,
                            borderWidth: 1,
                            borderColor: '#F3F4F6',
                            marginBottom: 100,
                        }}
                    >
                        <Text
                            style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}
                        >
                            Business Details
                        </Text>

                        <View style={{ gap: 18 }}>
                            {/* Address */}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                <View
                                    style={{
                                        height: 40,
                                        width: 40,
                                        borderRadius: 20,
                                        backgroundColor: '#F9FAFB',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <MapPin size={18} color="#6B7280" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 }}>
                                        {safeData.city || 'Location'}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 18 }}>
                                        {safeData.address || 'Address not listed'}
                                    </Text>
                                </View>
                            </View>

                            {/* Hours */}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                <View
                                    style={{
                                        height: 40,
                                        width: 40,
                                        borderRadius: 20,
                                        backgroundColor: '#F9FAFB',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Clock size={18} color="#6B7280" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: safeData.isOpen ? '#16A34A' : '#6B7280', marginBottom: 3 }}>
                                        {safeData.isOpen ? '● Open Now' : '○ Closed'}
                                    </Text>
                                    {safeData.openingHours && (
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                            {safeData.openingHours.open} – {safeData.openingHours.close}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Phone */}
                            {safeData.phone && (
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(`tel:${safeData.phone}`)}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                                >
                                    <View
                                        style={{
                                            height: 40,
                                            width: 40,
                                            borderRadius: 20,
                                            backgroundColor: '#F9FAFB',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Phone size={18} color="#6B7280" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY }}>{safeData.phone}</Text>
                                    </View>
                                    <ChevronRight size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
