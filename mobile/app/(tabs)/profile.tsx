import React, { useCallback, useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Alert,
    Switch,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    Phone, Mail, Bell, Shield, LogOut, ChevronRight,
    Edit2, Moon, HelpCircle, Save, ArrowLeft,
} from 'lucide-react-native';
import { useProfileData } from '../../hooks/useProfileData';
import { supabase } from '../../lib/supabase';

const PRIMARY = '#900A12';

export default function ProfileScreen() {
    const router = useRouter();
    const { profile, isLoading, refetch } = useProfileData();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    // Sync name when profile loads
    useEffect(() => {
        if (profile?.fullName && !name) {
            setName(profile.fullName);
        }
    }, [profile?.fullName]);

    const handleRefresh = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const handleLogout = async () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                    router.replace('/(auth)/login');
                },
            },
        ]);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return;
        }
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: name.trim() })
                .eq('id', user?.id);
            if (error) throw error;
            setIsEditing(false);
            refetch();
            Alert.alert('✓ Saved', 'Your name has been updated.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading && !profile) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
                <ActivityIndicator size="large" color={PRIMARY} />
            </View>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#F9FAFB' }}
            refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={PRIMARY} />}
        >
            {/* ── Header ── */}
            <View
                style={{
                    backgroundColor: PRIMARY,
                    borderBottomLeftRadius: 40,
                    borderBottomRightRadius: 40,
                    paddingHorizontal: 20,
                    paddingTop: 56,
                    paddingBottom: 48,
                    alignItems: 'center',
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 20 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={20} color="white" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: 'white', marginRight: 40 }}>My Profile</Text>
                    </View>
                </View>

                {/* Avatar */}
                <View style={{ position: 'relative' }}>
                    <View
                        style={{
                            height: 96,
                            width: 96,
                            borderRadius: 48,
                            borderWidth: 4,
                            borderColor: 'rgba(255,255,255,0.3)',
                            overflow: 'hidden',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                        }}
                    >
                        {profile?.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 42 }}>👤</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            height: 28,
                            width: 28,
                            borderRadius: 14,
                            backgroundColor: PRIMARY,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: 'white',
                            elevation: 4,
                        }}
                    >
                        <Edit2 size={12} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Name */}
                <View style={{ marginTop: 14, alignItems: 'center', width: '100%' }}>
                    {isEditing ? (
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', maxWidth: 280, width: '100%' }}>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                autoFocus
                                style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.4)',
                                    color: 'white',
                                    textAlign: 'center',
                                    borderRadius: 12,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    fontSize: 16,
                                }}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                placeholder="Your name"
                            />
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={isSaving}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.25)',
                                    borderRadius: 12,
                                    padding: 10,
                                }}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Save size={16} color="white" />
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => { setIsEditing(true); setName(profile?.fullName || ''); }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                            <Text style={{ fontSize: 22, fontWeight: '700', color: 'white' }}>
                                {profile?.fullName || 'Set your name'}
                            </Text>
                            <Edit2 size={14} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    )}

                    {/* Member badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <View
                            style={{
                                backgroundColor: 'rgba(17,24,39,0.85)',
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 20,
                            }}
                        >
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {profile?.userType === 'owner' ? 'Business Owner' : 'Gold Member'}
                            </Text>
                        </View>
                        {profile?.memberSince && (
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                                SINCE {profile.memberSince.toUpperCase()}
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            {/* ── Contact Information ── */}
            <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        padding: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 10,
                        elevation: 4,
                    }}
                >
                    <Text style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600', marginBottom: 18 }}>
                        CONTACT INFORMATION
                    </Text>

                    <View style={{ gap: 18 }}>
                        {/* Phone */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View
                                style={{
                                    height: 38,
                                    width: 38,
                                    borderRadius: 12,
                                    backgroundColor: `${PRIMARY}12`,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Phone size={16} color={PRIMARY} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                                    Phone Number
                                </Text>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                                    {profile?.phone ? `+${profile.phone}` : 'Not available'}
                                </Text>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />

                        {/* Email */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View
                                style={{
                                    height: 38,
                                    width: 38,
                                    borderRadius: 12,
                                    backgroundColor: `${PRIMARY}12`,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Mail size={16} color={PRIMARY} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                                    Email Address
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: profile?.email ? '#111827' : '#9CA3AF',
                                        fontStyle: profile?.email ? 'normal' : 'italic',
                                    }}
                                >
                                    {profile?.email || 'Not set'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* ── App Settings ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 6,
                        elevation: 2,
                    }}
                >
                    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
                        <Text style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' }}>
                            APP SETTINGS
                        </Text>
                    </View>

                    {/* Notifications toggle */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingVertical: 14,
                            borderTopWidth: 1,
                            borderTopColor: '#F3F4F6',
                        }}
                    >
                        <View
                            style={{
                                height: 36,
                                width: 36,
                                borderRadius: 10,
                                backgroundColor: '#F3F4F6',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 14,
                            }}
                        >
                            <Bell size={18} color="#6B7280" />
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' }}>Notifications</Text>
                        <Switch
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{ false: '#D1D5DB', true: `${PRIMARY}80` }}
                            thumbColor={notifications ? PRIMARY : '#F3F4F6'}
                        />
                    </View>

                    {/* Dark Mode toggle */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingVertical: 14,
                            borderTopWidth: 1,
                            borderTopColor: '#F3F4F6',
                        }}
                    >
                        <View
                            style={{
                                height: 36,
                                width: 36,
                                borderRadius: 10,
                                backgroundColor: '#F3F4F6',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 14,
                            }}
                        >
                            <Moon size={18} color="#6B7280" />
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' }}>Dark Mode</Text>
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            trackColor={{ false: '#D1D5DB', true: `${PRIMARY}80` }}
                            thumbColor={darkMode ? PRIMARY : '#F3F4F6'}
                        />
                    </View>

                    {/* Privacy */}
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingVertical: 14,
                            borderTopWidth: 1,
                            borderTopColor: '#F3F4F6',
                        }}
                        onPress={() => Linking.openURL('https://druto.me/legal?section=privacy')}
                    >
                        <View
                            style={{
                                height: 36,
                                width: 36,
                                borderRadius: 10,
                                backgroundColor: '#F3F4F6',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 14,
                            }}
                        >
                            <Shield size={18} color="#6B7280" />
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' }}>Privacy & Security</Text>
                        <ChevronRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* Help */}
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingVertical: 14,
                            borderTopWidth: 1,
                            borderTopColor: '#F3F4F6',
                        }}
                        onPress={() => Linking.openURL('mailto:support@druto.me')}
                    >
                        <View
                            style={{
                                height: 36,
                                width: 36,
                                borderRadius: 10,
                                backgroundColor: '#F3F4F6',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 14,
                            }}
                        >
                            <HelpCircle size={18} color="#6B7280" />
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' }}>Help & Support</Text>
                        <ChevronRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── App version ── */}
            <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Druto v1.0 • Your Loyalty Companion</Text>
            </View>

            {/* ── Sign Out ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 120 }}>
                <TouchableOpacity
                    onPress={handleLogout}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: `${PRIMARY}40`,
                        paddingVertical: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    <LogOut size={18} color={PRIMARY} />
                    <Text style={{ color: PRIMARY, fontSize: 15, fontWeight: '700' }}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
