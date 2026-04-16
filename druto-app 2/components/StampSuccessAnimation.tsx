import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
    Easing,
    interpolate
} from 'react-native-reanimated';
import { Check, Sparkles, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#900A12';

interface ParticleProps {
    id: number;
    angle: number;
    delay: number;
    distance: number;
    size: number;
    duration: number;
}

const Particle = ({ id, angle, delay, distance, size, duration }: ParticleProps) => {
    const progress = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        const rad = (angle * Math.PI) / 180;
        const currentDistance = interpolate(progress.value, [0, 1], [0, distance]);
        const opacity = interpolate(progress.value, [0, 0.5, 1], [0, 1, 0]);
        const scale = interpolate(progress.value, [0, 0.5, 1], [0, 1.2, 0]);

        return {
            opacity,
            transform: [
                { translateX: Math.cos(rad) * currentDistance },
                { translateY: Math.sin(rad) * currentDistance },
                { scale }
            ]
        };
    });

    useEffect(() => {
        progress.value = withDelay(300 + delay * 1000, withTiming(1, {
            duration: duration * 1000,
            easing: Easing.out(Easing.quad)
        }));
    }, []);

    return (
        <Animated.View style={[{ position: 'absolute', zIndex: 10 }, animatedStyle]}>
            {id % 2 === 0 ? (
                <Sparkles size={size} color={PRIMARY} fill="transparent" />
            ) : (
                <Star size={size} color="#FBBF24" fill="#FBBF24" />
            )}
        </Animated.View>
    );
};

const AmbientParticle = ({ index }: { index: number }) => {
    const xPos = useMemo(() => 10 + index * 11, [index]);
    const delay = useMemo(() => 500 + index * 150, [index]);
    const duration = useMemo(() => 2500 + Math.random() * 1000, []);

    const yPos = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        yPos.value = withDelay(delay, withTiming(-height - 100, { duration, easing: Easing.out(Easing.quad) }));
        opacity.value = withDelay(delay, withSequence(
            withTiming(0.6, { duration: duration * 0.2 }),
            withTiming(0.6, { duration: duration * 0.6 }),
            withTiming(0, { duration: duration * 0.2 })
        ));
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: yPos.value }],
        opacity: opacity.value,
        left: `${xPos}%`,
        position: 'absolute',
        bottom: 0,
    }));

    return (
        <Animated.View style={style}>
            <Sparkles size={20} color="rgba(144, 10, 18, 0.4)" />
        </Animated.View>
    );
};

interface StampSuccessAnimationProps {
    isVisible: boolean;
    currentStamps: number;
    totalStamps: number;
    restaurantName: string;
    onComplete?: () => void;
    pendingLabel?: string;
    rewardImageUrl?: string | null;
}

export const StampSuccessAnimation = ({
    isVisible,
    currentStamps,
    totalStamps,
    restaurantName,
    onComplete,
    pendingLabel,
    rewardImageUrl,
}: StampSuccessAnimationProps) => {

    const particles = useMemo(() => [...Array(16)].map((_, i) => ({
        id: i,
        angle: (i * 360) / 16,
        delay: i * 0.03,
        distance: 100 + Math.random() * 60,
        size: 12 + Math.random() * 8,
        duration: 1.2 + Math.random() * 0.4
    })), []);

    const dashRotation = useSharedValue(0);
    const ring1Progress = useSharedValue(0);
    const ring2Progress = useSharedValue(0);

    // Stamp entrance
    const stampScale = useSharedValue(0);
    const stampRotation = useSharedValue(-180);

    const checkScale = useSharedValue(0);
    const badgeScale = useSharedValue(0);
    const badgeY = useSharedValue(20);
    const textY = useSharedValue(30);
    const textOpacity = useSharedValue(0);

    const onCompleteRef = React.useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        if (isVisible) {
            // Unmount timer
            const timer = setTimeout(() => {
                onCompleteRef.current?.();
            }, 3500);

            // Dashed ring infinitely rotates
            dashRotation.value = withRepeat(withTiming(360, { duration: 20000, easing: Easing.linear }), -1, false);

            // Expanding glow rings
            ring1Progress.value = withDelay(200, withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }));
            ring2Progress.value = withDelay(350, withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }));

            // Main stamp circle springs in
            stampScale.value = withDelay(100, withSpring(1, { stiffness: 200, damping: 15 }));
            stampRotation.value = withDelay(100, withSpring(0, { stiffness: 200, damping: 15 }));

            // Checkmark delays then springs in
            checkScale.value = withDelay(1800, withSpring(1, { stiffness: 300, damping: 12 }));

            // Badge springs in
            badgeScale.value = withDelay(600, withSpring(1, { stiffness: 400, damping: 15 }));
            badgeY.value = withDelay(600, withSpring(0, { stiffness: 400, damping: 15 }));

            // Text fades and slides up
            textOpacity.value = withDelay(700, withTiming(1, { duration: 600, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
            textY.value = withDelay(700, withTiming(0, { duration: 600, easing: Easing.bezier(0.22, 1, 0.36, 1) }));

            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ring1Progress.value, [0, 0.5, 1], [0.5, 2.5, 3]) }],
        opacity: interpolate(ring1Progress.value, [0, 0.8, 1], [0, 0.4, 0]),
    }));

    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ring2Progress.value, [0, 0.5, 1], [0.8, 1.8, 2.2]) }],
        opacity: interpolate(ring2Progress.value, [0, 0.8, 1], [0, 0.5, 0]),
    }));

    const stampStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: stampScale.value },
            { rotate: `${stampRotation.value}deg` }
        ]
    }));

    const dashStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${dashRotation.value}deg` }]
    }));

    const checkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkScale.value }],
        opacity: checkScale.value
    }));

    const badgeStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: badgeScale.value },
            { translateY: badgeY.value }
        ]
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textY.value }]
    }));

    if (!isVisible) return null;

    const stampsRemaining = totalStamps - currentStamps;

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={[StyleSheet.absoluteFill, { zIndex: 200, alignItems: 'center', justifyContent: 'center' }]}
        >
            {/* Backdrop */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.95)' }]} />

            {/* Ambient Floating Particles */}
            {[...Array(8)].map((_, i) => (
                <AmbientParticle key={`ambient-${i}`} index={i} />
            ))}

            {/* Particle Burst Area */}
            <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                {particles.map((p) => (
                    <Particle key={p.id} {...p} />
                ))}
            </View>

            {/* Main Content Area */}
            <View style={{ position: 'relative', alignItems: 'center', zIndex: 10 }}>
                {/* Glow Rings */}
                <Animated.View
                    style={[{
                        position: 'absolute',
                        top: 0,
                        width: 128,
                        height: 128,
                        borderRadius: 64,
                        backgroundColor: `${PRIMARY}33`, // 20% opacity
                    }, ring1Style]}
                />
                <Animated.View
                    style={[{
                        position: 'absolute',
                        top: 0,
                        width: 128,
                        height: 128,
                        borderRadius: 64,
                        backgroundColor: `${PRIMARY}4D`, // 30% opacity
                    }, ring2Style]}
                />

                {/* Stamp Circle */}
                <Animated.View style={[{ marginBottom: 32, alignItems: 'center', justifyContent: 'center', width: 128, height: 128 }, stampStyle]}>
                    <LinearGradient
                        colors={[PRIMARY, '#6B070D']}
                        style={{
                            width: 128,
                            height: 128,
                            borderRadius: 64,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: PRIMARY,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.5,
                            shadowRadius: 20,
                            elevation: 10,
                        }}
                    >
                        {/* Dashed Rotary Ring */}
                        <Animated.View
                            style={[{
                                position: 'absolute',
                                width: 112, // inset-2 equivalent roughly
                                height: 112,
                                borderRadius: 56,
                                borderStyle: 'dashed',
                                borderWidth: 4,
                                borderColor: 'rgba(255,255,255,0.3)',
                            }, dashStyle]}
                        />

                        {/* Checkmark or Reward Image */}
                        <Animated.View style={checkStyle}>
                            {stampsRemaining === 0 && rewardImageUrl ? (
                                <View style={{ width: 112, height: 112, borderRadius: 56, overflow: 'hidden' }}>
                                    <Image source={{ uri: rewardImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                </View>
                            ) : (
                                <Check size={56} color="white" strokeWidth={4} />
                            )}
                        </Animated.View>
                    </LinearGradient>

                    {/* Stamp Count Badge */}
                    <Animated.View
                        style={[{
                            position: 'absolute',
                            bottom: -8,
                            right: -8,
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: 'white',
                            borderColor: '#F9FAFB',
                            borderWidth: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            elevation: 5,
                        }, badgeStyle]}
                    >
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{currentStamps}</Text>
                    </Animated.View>
                </Animated.View>

                {/* Success Text */}
                <Animated.View style={[{ alignItems: 'center', paddingHorizontal: 24 }, textStyle]}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 }}>
                        {pendingLabel ? "Visit Recorded! 📝" : "Stamp Collected! 🎉"}
                    </Text>
                    <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 16, textAlign: 'center', fontWeight: '500' }}>
                        at {restaurantName}
                    </Text>

                    {pendingLabel && (
                        <View style={{ backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#D97706' }}>{pendingLabel}</Text>
                        </View>
                    )}
                </Animated.View>
            </View>
        </Animated.View>
    );
};
