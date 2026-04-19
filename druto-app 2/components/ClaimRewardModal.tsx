import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
} from 'react-native';
import { X, Gift, PartyPopper } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const PRIMARY = '#900A12';

interface ClaimRewardModalProps {
    visible: boolean;
    onClose: () => void;
    reward: {
        id?: string;
        loyaltyCardId?: string;
        restaurantId?: string;
        rewardId?: string;
        restaurantName: string;
        rewardName: string;
        icon: string;
        imageUrl?: string | null;
    };
    onRewardClaimed?: () => void;
}

type Stage = 'confirm' | 'claiming' | 'success';

export function ClaimRewardModal({ visible, onClose, reward, onRewardClaimed }: ClaimRewardModalProps) {
    const [stage, setStage] = useState<Stage>('confirm');
    const [claimedRewardId, setClaimedRewardId] = useState<string | null>(null);

    const reset = () => {
        setStage('confirm');
        setClaimedRewardId(null);
    };

    const handleClose = () => {
        reset();
        onClose();
        onRewardClaimed?.();
    };

    const handleClaim = async () => {
        setStage('claiming');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'Please log in to claim rewards');
                setStage('confirm');
                return;
            }

            // Only block if completely absent (not just empty string)
            if (reward.rewardId == null || reward.restaurantId == null) {
                Alert.alert('Missing Info', 'Reward or restaurant information is missing. Please refresh and try again.');
                setStage('confirm');
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(
                `${SUPABASE_FUNCTIONS_URL}/claim-reward`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: ANON_KEY,
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                        userId: user.id,
                        rewardId: reward.rewardId,
                        restaurantId: reward.restaurantId,
                        loyaltyCardId: reward.loyaltyCardId || null,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result?.success) {
                Alert.alert('Error', result?.error || 'Failed to claim reward');
                setStage('confirm');
                return;
            }

            setClaimedRewardId(result.claimedRewardId || null);
            setStage('success');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to claim reward');
            setStage('confirm');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={{ flex: 1, backgroundColor: stage === 'confirm' ? '#111827' : 'rgba(0,0,0,0.5)', justifyContent: stage === 'confirm' ? 'flex-start' : 'flex-end' }}>
                {stage !== 'confirm' && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                )}
                {/* CONFIRM stage */}
                {stage === 'confirm' && (
                    <View style={{ flex: 1, backgroundColor: '#111827' }}>
                        {/* Deep red background at the top */}
                        <View
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '60%',
                                backgroundColor: PRIMARY,
                                borderBottomLeftRadius: 48,
                                borderBottomRightRadius: 48
                            }}
                        />

                        <SafeAreaView style={{ flex: 1 }}>
                            {/* Header Text */}
                            <View style={{ paddingHorizontal: 24, paddingTop: 40, marginBottom: 32 }}>
                                <Text style={{ fontSize: 32, fontWeight: '800', color: 'white', marginBottom: 8, letterSpacing: -0.5 }}>Redeem Reward</Text>
                                <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>Confirm and show this to the merchant</Text>
                            </View>

                            {/* Main White Card */}
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: 'white',
                                    marginHorizontal: 20,
                                    marginBottom: 40,
                                    borderRadius: 40,
                                    padding: 24,
                                    alignItems: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 10 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 20,
                                    elevation: 10,
                                }}
                            >
                                <Text style={{ fontSize: 11, color: PRIMARY, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '800', marginTop: 12 }}>
                                    {reward.restaurantName}
                                </Text>
                                <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', marginTop: 8, marginBottom: 28, textAlign: 'center', letterSpacing: -0.5 }}>
                                    {reward.rewardName}
                                </Text>

                                {/* Reward image */}
                                <View
                                    style={{
                                        width: '100%',
                                        aspectRatio: 1,
                                        borderRadius: 24,
                                        overflow: 'hidden',
                                        backgroundColor: '#F9FAFB',
                                        marginBottom: 32,
                                    }}
                                >
                                    {reward.imageUrl ? (
                                        <Image source={{ uri: reward.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    ) : (
                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 80 }}>{reward.icon}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Primary Button */}
                                <TouchableOpacity
                                    onPress={handleClaim}
                                    style={{
                                        backgroundColor: PRIMARY,
                                        width: '100%',
                                        borderRadius: 20,
                                        paddingVertical: 20,
                                        alignItems: 'center',
                                        shadowColor: PRIMARY,
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: 0.4,
                                        shadowRadius: 16,
                                        elevation: 8,
                                    }}
                                >
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 17, letterSpacing: 1.5 }}>
                                        CLAIM REWARD
                                    </Text>
                                </TouchableOpacity>

                                {/* Helper Text */}
                                <Text style={{ fontSize: 13, color: '#4B5563', textAlign: 'center', marginTop: 24, marginBottom: 32, lineHeight: 20, fontWeight: '600', paddingHorizontal: 16 }}>
                                    Please show this screen to the merchant to scan and complete your redemption.
                                </Text>

                                {/* Cancel Button */}
                                <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 8, paddingHorizontal: 24 }}>
                                    <Text style={{ color: PRIMARY, fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </View>
                )}

                {/* CLAIMING stage */}
                {stage === 'claiming' && (
                    <View style={{ padding: 48, alignItems: 'center' }}>
                        <View
                            style={{
                                height: 96,
                                width: 96,
                                borderRadius: 28,
                                backgroundColor: PRIMARY,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 24,
                            }}
                        >
                            <Gift size={48} color="white" />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
                            Unwrapping your reward...
                        </Text>
                        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>✨ Something special is coming!</Text>
                        <ActivityIndicator size="large" color={PRIMARY} />
                        <View style={{ height: 32 }} />
                    </View>
                )}

                {/* SUCCESS stage */}
                {stage === 'success' && (
                    <View style={{ padding: 24 }}>
                        {/* Close button */}
                        <TouchableOpacity
                            onPress={handleClose}
                            style={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                height: 32,
                                width: 32,
                                borderRadius: 16,
                                backgroundColor: '#F3F4F6',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                            }}
                        >
                            <X size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Trophy */}
                        <View style={{ alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
                            <View
                                style={{
                                    height: 112,
                                    width: 112,
                                    borderRadius: 56,
                                    backgroundColor: '#FCD34D',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: '#FCD34D',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 16,
                                    elevation: 10,
                                    marginBottom: 20,
                                }}
                            >
                                <Text style={{ fontSize: 48 }}>🎉</Text>
                            </View>

                            <Text style={{ fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 4 }}>You Won!</Text>
                            <Text style={{ fontSize: 14, color: '#6B7280' }}>Congratulations! Show this to the staff</Text>
                        </View>

                        {/* Reward details */}
                        <View
                            style={{
                                backgroundColor: '#DCFCE7',
                                borderRadius: 20,
                                padding: 20,
                                borderWidth: 2,
                                borderColor: '#86EFAC',
                                marginBottom: 16,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <View
                                    style={{
                                        height: 48,
                                        width: 48,
                                        borderRadius: 14,
                                        backgroundColor: 'white',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {reward.imageUrl ? (
                                        <Image source={{ uri: reward.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    ) : (
                                        <Text style={{ fontSize: 24 }}>{reward.icon}</Text>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' }}>
                                        {reward.restaurantName}
                                    </Text>
                                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>{reward.rewardName}</Text>
                                </View>
                            </View>

                            {claimedRewardId && (
                                <View style={{ backgroundColor: '#BBF7D0', borderRadius: 10, padding: 10 }}>
                                    <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700', textAlign: 'center', letterSpacing: 1 }}>
                                        ID: {claimedRewardId.slice(0, 8).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Show to staff instruction */}
                        <View
                            style={{
                                backgroundColor: `${PRIMARY}0D`,
                                borderRadius: 14,
                                padding: 16,
                                borderWidth: 1,
                                borderColor: `${PRIMARY}33`,
                                marginBottom: 20,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>👆 Show this screen to the staff</Text>
                            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                                They'll confirm and hand over your reward!
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleClose}
                            style={{
                                backgroundColor: '#F3F4F6',
                                borderRadius: 14,
                                paddingVertical: 16,
                                alignItems: 'center',
                                marginBottom: 8,
                            }}
                        >
                            <Text style={{ color: '#111827', fontWeight: '700', fontSize: 15 }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
}

