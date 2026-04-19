import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, AlertCircle, CheckCircle2, Zap, Flashlight } from 'lucide-react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    withSequence,
    Easing
} from 'react-native-reanimated';
import { useScanLogic } from '../../hooks/useScanLogic';
import { StampSuccessAnimation } from '../../components/StampSuccessAnimation';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#900A12';

type ScanState = 'ready' | 'scanning' | 'processing' | 'success' | 'pending-approval' | 'error' | 'already-scanned' | 'too-far';

const ScanningLine = () => {
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(250, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
                withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: PRIMARY,
                    shadowColor: PRIMARY,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 10,
                    elevation: 5,
                    zIndex: 10,
                },
                animatedStyle,
            ]}
        />
    );
};

export default function ScannerScreen() {
    const router = useRouter();
    const { restaurantId: paramRestaurantId } = useLocalSearchParams();
    const [permission, requestPermission] = useCameraPermissions();
    const { processQRScan, isProcessing } = useScanLogic();

    const [scanState, setScanState] = useState<ScanState>('ready');
    const [scanned, setScanned] = useState(false);
    const [flash, setFlash] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [allowRemoteScan, setAllowRemoteScan] = useState(false);

    const [stampData, setStampData] = useState({
        currentStamps: 0,
        totalStamps: 10,
        restaurantName: '',
        restaurantSlug: '',
        restaurantId: '',
        rewardImageUrl: null as string | null,
    });

    useEffect(() => {
        if (paramRestaurantId) {
            handleProcessScan(paramRestaurantId as string);
        }
    }, [paramRestaurantId]);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned || isProcessing) return;
        setScanned(true);
        // Extract everything after /scan/ as the identifier (can be a UUID or a slug)
        const match = data.match(/\/scan\/([a-zA-Z0-9-]+)/);
        const extractedId = match ? match[1] : data;
        handleProcessScan(extractedId);
    };

    const handleProcessScan = async (id: string, options?: { requestPending?: boolean }) => {
        setScanState('processing');
        setStampData(prev => ({ ...prev, restaurantId: id }));
        const result = await processQRScan(id, options);

        if (result.success) {
            setStampData({
                currentStamps: result.currentStamps || 0,
                totalStamps: result.totalStamps || 10,
                restaurantName: result.restaurantName || 'Restaurant',
                restaurantSlug: result.restaurantSlug || '',
                restaurantId: result.restaurantId || id,
                rewardImageUrl: result.rewardImageUrl || null,
            });

            if (result.pendingApproval) {
                setScanState('pending-approval');
            } else {
                setScanState('success');
                setShowAnimation(true);
            }
        } else {
            setScanned(false);
            setAllowRemoteScan(result.allowRemoteScan || false);
            if (result.alreadyScannedToday) {
                setScanState('already-scanned');
                setStampData((prev) => ({ ...prev, restaurantName: result.restaurantName || 'Restaurant' }));
            } else if (result.error?.includes('too far')) {
                setScanState('too-far');
                setErrorMsg(result.error);
            } else {
                setScanState('error');
                setErrorMsg(result.error || 'Something went wrong');
            }
        }
    };

    const resetScan = () => {
        setScanned(false);
        setScanState('scanning');
        setErrorMsg('');
    };

    if (!permission) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 40 }}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={{ marginTop: 16, color: '#6B7280', fontWeight: '500' }}>Initializing camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 40 }}>
                <View
                    style={{
                        height: 80,
                        width: 80,
                        borderRadius: 24,
                        backgroundColor: '#FEE2E2',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                    }}
                >
                    <AlertCircle size={40} color="#EF4444" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                    Camera Access Needed
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32 }}>
                    Druto needs camera access to scan QR codes and record your visits.
                </Text>
                <TouchableOpacity
                    onPress={requestPermission}
                    style={{
                        backgroundColor: PRIMARY,
                        paddingHorizontal: 32,
                        paddingVertical: 16,
                        borderRadius: 16,
                        width: '100%',
                    }}
                >
                    <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center', fontSize: 16 }}>Allow Camera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            {/* Animation Overlay */}
            <StampSuccessAnimation
                isVisible={showAnimation}
                currentStamps={stampData.currentStamps}
                totalStamps={stampData.totalStamps}
                restaurantName={stampData.restaurantName}
                rewardImageUrl={stampData.rewardImageUrl}
                onComplete={() => {
                    const targetId = stampData.restaurantSlug || stampData.restaurantId;
                    if (targetId) {
                        router.replace(`/restaurant/${targetId}` as any);
                    } else {
                        router.replace('/(tabs)');
                    }
                }}
            />

            {/* Header Overlay */}
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 150,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 24,
                    paddingTop: 64,
                    paddingBottom: 24,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        height: 48,
                        width: 48,
                        borderRadius: 24,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <X size={24} color="white" />
                </TouchableOpacity>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 18, letterSpacing: -0.5 }}>Scan QR Code</Text>
                <TouchableOpacity
                    onPress={() => setFlash(!flash)}
                    style={{
                        height: 48,
                        width: 48,
                        borderRadius: 24,
                        backgroundColor: flash ? PRIMARY : 'rgba(0,0,0,0.4)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Flashlight size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Main Viewport */}
            <View style={{ flex: 1 }}>
                {scanState === 'processing' ? (
                    <Animated.View
                        entering={FadeIn}
                        exiting={FadeOut}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', zIndex: 100 }}
                    >
                        <ActivityIndicator size="large" color={PRIMARY} />
                        <Text style={{ marginTop: 24, color: '#111827', fontWeight: '800', fontSize: 24, letterSpacing: -0.5 }}>Verifying visit...</Text>
                        <Text style={{ marginTop: 8, color: '#6B7280', fontWeight: '600', fontSize: 16 }}>Checking your location</Text>
                    </Animated.View>
                ) : scanState === 'error' || scanState === 'too-far' ? (
                    <Animated.View
                        entering={FadeIn}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 40, zIndex: 100 }}
                    >
                        <View
                            style={{
                                height: 80,
                                width: 80,
                                borderRadius: 32,
                                backgroundColor: '#FEE2E2',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 24,
                                transform: [{ rotate: '-10deg' }]
                            }}
                        >
                            <AlertCircle size={40} color="#EF4444" />
                        </View>
                        <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8, letterSpacing: -1 }}>
                            {scanState === 'too-far' ? 'Too Far Away' : 'Scan Failed'}
                        </Text>
                        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 40, lineHeight: 22, fontWeight: '500' }}>{errorMsg}</Text>
                        <View style={{ width: '100%', gap: 12 }}>
                            <TouchableOpacity
                                onPress={resetScan}
                                style={{ backgroundColor: PRIMARY, paddingVertical: 18, borderRadius: 20, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                            >
                                <Text style={{ color: 'white', fontWeight: '800', textAlign: 'center', fontSize: 16 }}>Try Again</Text>
                            </TouchableOpacity>
                            {allowRemoteScan && (
                                <TouchableOpacity
                                    onPress={() =>
                                        handleProcessScan(stampData.restaurantId || (paramRestaurantId as string), { requestPending: true })
                                    }
                                    style={{ backgroundColor: '#F8F9FA', paddingVertical: 18, borderRadius: 20, borderWidth: 1, borderColor: '#E9ECEF' }}
                                >
                                    <Text style={{ color: '#111827', fontWeight: '700', textAlign: 'center', fontSize: 16 }}>
                                        Ask Staff to Approve
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>
                ) : scanState === 'already-scanned' ? (
                    <Animated.View
                        entering={FadeIn}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 40, zIndex: 100 }}
                    >
                        <View
                            style={{
                                height: 80,
                                width: 80,
                                borderRadius: 32,
                                backgroundColor: `${PRIMARY}15`,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 24,
                            }}
                        >
                            <CheckCircle2 size={40} color={PRIMARY} />
                        </View>
                        <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8, letterSpacing: -1 }}>
                            Already Scanned
                        </Text>
                        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 40, lineHeight: 24, fontWeight: '500' }}>
                            You've already collected your stamp at {stampData.restaurantName} for today.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.replace('/(tabs)')}
                            style={{
                                backgroundColor: PRIMARY,
                                paddingVertical: 18,
                                borderRadius: 20,
                                width: '100%',
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: '800', textAlign: 'center', fontSize: 16 }}>
                                Back to Dashboard
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                ) : scanState === 'pending-approval' ? (
                    <StampSuccessAnimation
                        isVisible={true}
                        currentStamps={stampData.currentStamps + 1}
                        totalStamps={stampData.totalStamps}
                        restaurantName={stampData.restaurantName}
                        pendingLabel="⏳ Pending staff approval"
                        onComplete={() => router.replace('/(tabs)')}
                    />
                ) : (
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        flash={flash ? 'on' : 'off'}
                    >
                        {/* Overlay with Scanner Frame */}
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Scanner frame */}
                            <View
                                style={{
                                    height: 260,
                                    width: 260,
                                    borderRadius: 32,
                                    borderWidth: 2,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    backgroundColor: 'rgba(0,0,0,0.1)'
                                }}
                            >
                                <ScanningLine />

                                {/* Corner accents */}
                                <View style={{ position: 'absolute', top: 0, left: 0, height: 40, width: 40, borderTopWidth: 5, borderLeftWidth: 5, borderColor: PRIMARY, borderTopLeftRadius: 30 }} />
                                <View style={{ position: 'absolute', top: 0, right: 0, height: 40, width: 40, borderTopWidth: 5, borderRightWidth: 5, borderColor: PRIMARY, borderTopRightRadius: 30 }} />
                                <View style={{ position: 'absolute', bottom: 0, left: 0, height: 40, width: 40, borderBottomWidth: 5, borderLeftWidth: 5, borderColor: PRIMARY, borderBottomLeftRadius: 30 }} />
                                <View style={{ position: 'absolute', bottom: 0, right: 0, height: 40, width: 40, borderBottomWidth: 5, borderRightWidth: 5, borderColor: PRIMARY, borderBottomRightRadius: 30 }} />
                            </View>

                            <View
                                style={{
                                    marginTop: 48,
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    paddingHorizontal: 28,
                                    paddingVertical: 14,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.1)',
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center', fontSize: 15 }}>Align QR code to center</Text>
                            </View>
                        </View>
                    </CameraView>
                )}
            </View>
        </View>
    );
}
