import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Check, Gift, ChevronRight } from 'lucide-react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface StampCardProps {
    current: number;
    total: number;
    restaurantName: string;
    rewardDescription: string;
    restaurantLogoUrl?: string | null;
    fallbackIcon?: string;
    className?: string;
    onClick?: () => void;
}

export const StampCard = memo(({
    current,
    total,
    restaurantName,
    rewardDescription,
    restaurantLogoUrl,
    fallbackIcon,
    className,
    onClick,
}: StampCardProps) => {
    const stamps = Array.from({ length: total }, (_, i) => i < current);
    const isComplete = current >= total;
    const stampsPerRow = 6;
    const rows = Math.ceil(total / stampsPerRow);

    return (
        <TouchableOpacity
            onPress={onClick}
            activeOpacity={0.7}
            className={cn(
                "relative overflow-hidden rounded-3xl bg-white border border-gray-100 p-4 mb-4",
                isComplete && "border-primary border-2",
                className
            )}
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
            }}
        >
            {/* Header */}
            <View className="flex-row items-start justify-between mb-4">
                <View className="flex-row items-center flex-1">
                    {/* Restaurant logo */}
                    <View className="h-12 w-12 rounded-2xl bg-amber-50 overflow-hidden items-center justify-center border border-amber-100">
                        {restaurantLogoUrl ? (
                            <Image
                                source={{ uri: restaurantLogoUrl }}
                                className="h-full w-full"
                                resizeMode="cover"
                            />
                        ) : fallbackIcon ? (
                            <Text className="text-2xl">{fallbackIcon}</Text>
                        ) : (
                            <Text className="text-amber-600 font-bold text-xl">
                                {restaurantName.charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <View className="ml-3 flex-1">
                        <Text className="text-lg font-bold text-gray-900 leading-tight" numberOfLines={1}>
                            {restaurantName}
                        </Text>
                        <Text className={cn("text-sm font-semibold text-primary")} numberOfLines={1}>
                            Win: {rewardDescription}
                        </Text>
                    </View>
                </View>

                {/* Stamps counter */}
                <View className="items-end ml-2">
                    <View className="flex-row items-baseline">
                        <Text className="text-xl font-bold text-primary">{current}</Text>
                        <Text className="text-gray-400 text-sm">/{total}</Text>
                    </View>
                    <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stamps</Text>
                </View>
            </View>

            {/* Stamp Grid */}
            <View className="flex-row items-end">
                <View className="flex-1">
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <View key={rowIndex} className="flex-row mb-2">
                            {stamps.slice(rowIndex * stampsPerRow, (rowIndex + 1) * stampsPerRow).map((filled, index) => {
                                const stampIndex = rowIndex * stampsPerRow + index;
                                const isLast = stampIndex === total - 1;

                                return (
                                    <View
                                        key={stampIndex}
                                        className={cn(
                                            "h-10 w-10 rounded-2xl items-center justify-center mr-2",
                                            filled
                                                ? "bg-primary"
                                                : "border-2 border-dashed border-red-100 bg-gray-50/50"
                                        )}
                                    >
                                        {filled ? (
                                            <Check size={16} color="white" strokeWidth={4} />
                                        ) : isLast ? (
                                            <Gift size={16} color="#D1D5DB" />
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>
                <ChevronRight size={20} color="#D1D5DB" className="mb-4" />
            </View>
        </TouchableOpacity>
    );
});

StampCard.displayName = "StampCard";
