import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView,
    ActivityIndicator, Linking, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useMsg91Auth } from '../../hooks/useMsg91Auth';

const PRIMARY = '#900A12';

export default function LoginScreen() {
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phoneInput, setPhoneInput] = useState('');
    const [otp, setOtp] = useState('');
    const [userType, setUserType] = useState<'customer' | 'owner'>('customer');

    const { isLoading, isOtpSent, error, resendTimer, sendOtp, verifyOtp } = useMsg91Auth(userType);

    React.useEffect(() => {
        if (isOtpSent && step === 'phone') setStep('otp');
    }, [isOtpSent]);

    const handleSendOTP = async () => {
        if (phoneInput.replace(/\D/g, '').length < 10) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
            return;
        }
        await sendOtp(phoneInput);
    };

    const handleVerifyOTP = async () => await verifyOtp(otp);

    const isPhoneValid = phoneInput.replace(/\D/g, '').length >= 10;

    return (
        <LinearGradient colors={['#FDF2F2', '#FFFFFF']} style={{ flex: 1 }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48, paddingTop: 60 }}>

                    {/* Progress */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 40 }}>
                        <View style={{ height: 4, width: 32, borderRadius: 2, backgroundColor: PRIMARY }} />
                        <View style={{ height: 4, width: 8, borderRadius: 2, backgroundColor: step === 'otp' ? PRIMARY : '#E5E7EB' }} />
                        <View style={{ height: 4, width: 8, borderRadius: 2, backgroundColor: '#E5E7EB' }} />
                    </View>

                    {/* Header */}
                    <View style={{ marginBottom: 36 }}>
                        <Text style={{ fontSize: 30, fontWeight: '800', color: '#111827', lineHeight: 38, marginBottom: 10 }}>
                            {step === 'phone'
                                ? userType === 'customer'
                                    ? 'Start earning free food rewards! 🍕'
                                    : 'Grow your business with loyalty! 🏪'
                                : 'Verify your number'}
                        </Text>
                        <Text style={{ fontSize: 16, color: '#6B7280', lineHeight: 24 }}>
                            {step === 'phone'
                                ? userType === 'customer'
                                    ? "Enter your number – delicious rewards await!"
                                    : "Enter your number – let's set up your loyalty program"
                                : `We've sent a 4-digit code to +91 ${phoneInput}`}
                        </Text>
                    </View>

                    {/* User Type Toggle */}
                    {step === 'phone' && (
                        <View style={{
                            flexDirection: 'row', alignSelf: 'center',
                            backgroundColor: '#F3F4F6', padding: 4, borderRadius: 100,
                            marginBottom: 32,
                        }}>
                            {[{ type: 'customer', emoji: '🍔', label: 'Customer' }, { type: 'owner', emoji: '🏪', label: 'Business' }].map(({ type, emoji, label }) => {
                                const active = userType === type;
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setUserType(type as any)}
                                        activeOpacity={0.8}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center',
                                            paddingHorizontal: 24, paddingVertical: 12,
                                            borderRadius: 100,
                                            backgroundColor: active ? 'white' : 'transparent',
                                            shadowColor: active ? '#000' : 'transparent',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: active ? 0.08 : 0,
                                            shadowRadius: 6,
                                            elevation: active ? 2 : 0,
                                        }}
                                    >
                                        <Text style={{ fontSize: 16, marginRight: 6 }}>{emoji}</Text>
                                        <Text style={{ fontSize: 15, fontWeight: active ? '700' : '500', color: active ? '#111827' : '#6B7280' }}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Error */}
                    {error && (
                        <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 14, borderRadius: 14, marginBottom: 16 }}>
                            <Text style={{ color: '#DC2626', textAlign: 'center', fontSize: 14, fontWeight: '500' }}>{error}</Text>
                        </View>
                    )}

                    {/* Phone Step */}
                    {step === 'phone' ? (
                        <View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Mobile Number</Text>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E5E7EB',
                                borderRadius: 16, height: 56, paddingHorizontal: 16,
                                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
                            }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#6B7280', marginRight: 10 }}>+91</Text>
                                <TextInput
                                    placeholder="9876543210"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={phoneInput}
                                    onChangeText={setPhoneInput}
                                    style={{ flex: 1, fontSize: 18, fontWeight: '500', color: '#111827' }}
                                />
                            </View>
                            <TouchableOpacity
                                onPress={handleSendOTP}
                                disabled={!isPhoneValid || isLoading}
                                activeOpacity={0.85}
                                style={{
                                    marginTop: 20, height: 56, borderRadius: 16,
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    backgroundColor: isPhoneValid ? PRIMARY : '#D1D5DB',
                                    shadowColor: isPhoneValid ? PRIMARY : 'transparent',
                                    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: isPhoneValid ? 4 : 0,
                                }}
                            >
                                {isLoading
                                    ? <ActivityIndicator color="white" />
                                    : <>
                                        <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Get OTP</Text>
                                        <ArrowRight size={20} color="white" />
                                    </>
                                }
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* OTP Step */
                        <View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 12, textAlign: 'center' }}>Enter 4-digit code</Text>
                            <TextInput
                                placeholder="• • • •"
                                placeholderTextColor="#D1D5DB"
                                keyboardType="number-pad"
                                maxLength={4}
                                value={otp}
                                onChangeText={(val) => {
                                    setOtp(val);
                                    if (val.length === 4) verifyOtp(val);
                                }}
                                textAlign="center"
                                style={{
                                    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E5E7EB',
                                    borderRadius: 16, height: 64, fontSize: 32, fontWeight: '700',
                                    color: '#111827', letterSpacing: 24, marginBottom: 24,
                                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
                                }}
                            />
                            <TouchableOpacity
                                onPress={handleVerifyOTP}
                                disabled={otp.length < 4 || isLoading}
                                activeOpacity={0.85}
                                style={{
                                    height: 56, borderRadius: 16,
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    backgroundColor: otp.length >= 4 ? PRIMARY : '#D1D5DB',
                                    shadowColor: otp.length >= 4 ? PRIMARY : 'transparent',
                                    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: otp.length >= 4 ? 4 : 0,
                                }}
                            >
                                {isLoading
                                    ? <ActivityIndicator color="white" />
                                    : <>
                                        <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Verify &amp; Continue</Text>
                                        <ArrowRight size={20} color="white" />
                                    </>
                                }
                            </TouchableOpacity>

                            {/* Resend */}
                            <TouchableOpacity
                                onPress={() => resendTimer === 0 ? sendOtp(phoneInput) : null}
                                disabled={resendTimer > 0}
                                style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            >
                                <RefreshCw size={14} color={resendTimer > 0 ? '#9CA3AF' : PRIMARY} />
                                <Text style={{ fontSize: 14, fontWeight: '500', color: resendTimer > 0 ? '#9CA3AF' : PRIMARY }}>
                                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); }} style={{ marginTop: 16, paddingVertical: 8 }}>
                                <Text style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', fontWeight: '500' }}>← Change number</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Footer */}
                    <View style={{ marginTop: 'auto', paddingTop: 40 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
                            <ShieldCheck size={14} color="#9CA3AF" />
                            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Secured with OTP verification</Text>
                        </View>
                        <Text style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', lineHeight: 18 }}>
                            By proceeding, you agree to Druto's{' '}
                            <Text
                                style={{ color: PRIMARY, fontWeight: '600' }}
                                onPress={() => Linking.openURL('https://druto.in/legal?section=terms')}
                            >
                                Terms
                            </Text>
                            {' '}and{' '}
                            <Text
                                style={{ color: PRIMARY, fontWeight: '600' }}
                                onPress={() => Linking.openURL('https://druto.in/legal?section=privacy')}
                            >
                                Privacy Policy
                            </Text>
                        </Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}
