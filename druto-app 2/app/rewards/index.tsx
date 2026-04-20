import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift, ChevronLeft, Clock, CheckCircle2, ChevronRight, MapPin } from 'lucide-react-native';
import { useRewardsData } from '../../hooks/useRewardsData';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function RewardsScreen() {
    const router = useRouter();
    const { availableRewards, claimedRewards, isLoading, refetch } = useRewardsData();

    const handleRefresh = useCallback(async () => {
        await refetch();
    }, [refetch]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
        );
    }

    const redeemedRewards = claimedRewards.filter((r: any) => r.isRedeemed);

    return (
        <ScrollView
            className="flex-1 bg-white"
            refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} colors={['#F59E0B']} />}
        >
            {/* Header */}
            <View
                style={{ backgroundColor: '#F59E0B', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 48 }}
            >
                <TouchableOpacity onPress={() => router.back()} className="mb-6 h-10 w-10 bg-white/20 rounded-full items-center justify-center">
                    <ChevronLeft size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-3xl font-bold text-white mb-1">My Rewards</Text>
                <Text className="text-white/80 text-base font-medium">Your earned treats and history</Text>
            </View>

            <View className="px-6 -mt-6">
                {/* Available Rewards */}
                <View className="mb-8">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Available to Redeem</Text>

                    {availableRewards.length === 0 ? (
                        <View className="py-12 bg-gray-50 rounded-3xl items-center border border-gray-100 border-dashed">
                            <Gift size={32} color="#D1D5DB" />
                            <Text className="text-gray-400 font-bold mt-4">No rewards to redeem yet</Text>
                        </View>
                    ) : (
                        availableRewards.map((reward: any) => (
                            <TouchableOpacity
                                key={reward.id}
                                className="bg-white rounded-3xl p-4 shadow-md border border-gray-100 mb-4 flex-row items-center"
                                onPress={() => Alert.alert('Redeem Reward', `Visit ${reward.restaurantName} to redeem your ${reward.reward}`)}
                            >
                                <View className="h-16 w-16 bg-amber-50 rounded-2xl items-center justify-center overflow-hidden border border-amber-100">
                                    {reward.logoUrl ? (
                                        <Image source={{ uri: Math.random() > 0.5 ? reward.logoUrl : 'https://druto.me/api/proxy/storage/v1/object/public/logos/default-restaurant.png' }} className="h-full w-full" />
                                    ) : (
                                        <Text className="text-2xl">{reward.icon}</Text>
                                    )}
                                </View>
                                <View className="flex-1 ml-4">
                                    <View className="flex-row items-center mb-1">
                                        <Text className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{reward.restaurantName}</Text>
                                        <View className="ml-2 bg-amber-100 px-1.5 py-0.5 rounded">
                                            <Text className="text-[8px] font-bold text-amber-900">NEW</Text>
                                        </View>
                                    </View>
                                    <Text className="text-lg font-bold text-gray-900">{reward.reward}</Text>
                                    <Text className="text-xs text-gray-400 mt-0.5 whitespace-nowrap overflow-hidden" numberOfLines={1}>
                                        Valid for {reward.expiresIn || '30 days'}
                                    </Text>
                                </View>
                                <View className="bg-amber-500 h-10 px-4 rounded-xl items-center justify-center">
                                    <Text className="text-white font-bold text-xs">REDEEM</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* History Section */}
                {redeemedRewards.length > 0 && (
                    <View className="pb-20">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-900">History</Text>
                            <TouchableOpacity>
                                <Text className="text-amber-500 font-bold text-sm">View All</Text>
                            </TouchableOpacity>
                        </View>

                        {redeemedRewards.slice(0, 5).map((item: any) => (
                            <View key={item.id} className="flex-row items-center bg-gray-50 p-4 rounded-2xl mb-3 border border-gray-100 opacity-60">
                                <View className="h-11 w-11 bg-white rounded-full items-center justify-center border border-gray-200">
                                    <Text className="text-lg">{item.icon}</Text>
                                </View>
                                <View className="flex-1 ml-4">
                                    <Text className="text-sm font-bold text-gray-900 italic" numberOfLines={1}>{item.reward}</Text>
                                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                        {item.restaurant} • {item.claimedAt}
                                    </Text>
                                </View>
                                <View className="px-2 py-1 rounded border border-gray-200">
                                    <Text className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Redeemed</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
