import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Gift } from 'lucide-react-native';
import { useRewardsData, type AvailableReward, type ClaimedReward } from '../../hooks/useRewardsData';
import { ClaimRewardModal } from '../../components/ClaimRewardModal';

const PRIMARY = '#900A12';

export default function RewardsScreen() {
    const { availableRewards, claimedRewards, isLoading, refetch } = useRewardsData();
    const [selectedReward, setSelectedReward] = useState<AvailableReward | null>(null);

    const handleRefresh = useCallback(async () => {
        await refetch();
    }, [refetch]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
                <ActivityIndicator size="large" color={PRIMARY} />
            </View>
        );
    }

    const redeemedRewards = claimedRewards.filter((r: ClaimedReward) => r.isRedeemed);

    return (
        <>
            <ScrollView
                style={{ flex: 1, backgroundColor: '#F9FAFB' }}
                refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={PRIMARY} />}
            >
                {/* Header - matching webapp */}
                <View
                    style={{
                        backgroundColor: PRIMARY,
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
                        paddingHorizontal: 20,
                        paddingTop: 64,
                        paddingBottom: 40,
                    }}
                >
                    <Text style={{ fontSize: 28, fontWeight: '700', color: 'white', marginBottom: 4 }}>My Rewards</Text>
                    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Your earned treats and history</Text>
                </View>

                {/* Available Rewards */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    {availableRewards.length === 0 ? (
                        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                            <View
                                style={{
                                    height: 56,
                                    width: 56,
                                    borderRadius: 16,
                                    backgroundColor: '#F3F4F6',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16,
                                }}
                            >
                                <Text style={{ fontSize: 28 }}>🎁</Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>No rewards yet</Text>
                            <Text style={{ fontSize: 14, color: '#6B7280' }}>Keep visiting to earn rewards!</Text>
                        </View>
                    ) : (
                        availableRewards.map((reward: AvailableReward) => (
                            <View
                                key={reward.id}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: 20,
                                    marginBottom: 12,
                                    overflow: 'hidden',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.06,
                                    shadowRadius: 8,
                                    elevation: 3,
                                }}
                            >
                                <View style={{ padding: 16, flexDirection: 'row', gap: 16 }}>
                                    {/* Left content */}
                                    <View style={{ flex: 1 }}>
                                        {/* Restaurant name */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                            <View
                                                style={{
                                                    height: 20,
                                                    width: 20,
                                                    borderRadius: 10,
                                                    backgroundColor: '#F3F4F6',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {reward.logoUrl ? (
                                                    <Image source={{ uri: reward.logoUrl }} style={{ width: '100%', height: '100%' }} />
                                                ) : (
                                                    <Text style={{ fontSize: 10 }}>{reward.icon}</Text>
                                                )}
                                            </View>
                                            <Text
                                                style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '500' }}
                                            >
                                                {reward.restaurantName}
                                            </Text>
                                            <View style={{ backgroundColor: '#FCD34D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#92400E' }}>NEW</Text>
                                            </View>
                                        </View>

                                        {/* Reward name */}
                                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
                                            {reward.reward}
                                        </Text>

                                        {/* Expiry */}
                                        {reward.expiresIn && (
                                            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>{reward.expiresIn}</Text>
                                        )}

                                        {/* Redeem button */}
                                        <TouchableOpacity
                                            onPress={() => setSelectedReward(reward)}
                                            style={{
                                                backgroundColor: PRIMARY,
                                                alignSelf: 'flex-start',
                                                paddingHorizontal: 20,
                                                paddingVertical: 8,
                                                borderRadius: 50,
                                                marginTop: 4,
                                            }}
                                        >
                                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>REDEEM</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Right image */}
                                    <View
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: 16,
                                            backgroundColor: '#FEF3C7',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {reward.logoUrl ? (
                                            <Image source={{ uri: reward.logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        ) : (
                                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ fontSize: 32 }}>{reward.icon}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* History Section */}
                {redeemedRewards.length > 0 && (
                    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                        <View
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}
                        >
                            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>History</Text>
                            <TouchableOpacity>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY }}>View All</Text>
                            </TouchableOpacity>
                        </View>

                        {redeemedRewards.slice(0, 3).map((item: ClaimedReward) => (
                            <View
                                key={item.id}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: 16,
                                    padding: 14,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 10,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.04,
                                    shadowRadius: 4,
                                    elevation: 2,
                                    opacity: 0.7,
                                }}
                            >
                                {/* logo */}
                                <View
                                    style={{
                                        height: 44,
                                        width: 44,
                                        borderRadius: 22,
                                        backgroundColor: '#F3F4F6',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                                </View>

                                {/* Info */}
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{ fontSize: 14, fontWeight: '600', color: '#111827', fontStyle: 'italic' }}
                                        numberOfLines={1}
                                    >
                                        {item.reward}
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            color: '#6B7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                            marginTop: 2,
                                        }}
                                    >
                                        {item.restaurant} • {item.claimedAt}
                                    </Text>
                                </View>

                                {/* Badge */}
                                <View
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#D1D5DB',
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 6,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            color: '#6B7280',
                                            fontWeight: '500',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        REDEEMED
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Bottom padding for tab bar */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Claim Modal */}
            {selectedReward && (
                <ClaimRewardModal
                    visible={!!selectedReward}
                    onClose={() => setSelectedReward(null)}
                    reward={{
                        id: selectedReward.id,
                        loyaltyCardId: selectedReward.loyaltyCardId || undefined,
                        restaurantId: selectedReward.restaurantId || undefined,
                        rewardId: selectedReward.rewardId || undefined,
                        restaurantName: selectedReward.restaurantName,
                        rewardName: selectedReward.reward,
                        icon: selectedReward.icon,
                        imageUrl: selectedReward.imageUrl,
                    }}
                    onRewardClaimed={refetch}
                />
            )}
        </>
    );
}
