import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    ActivityIndicator, RefreshControl, Share, Modal,
    TextInput, Alert, Linking, Switch, ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    TrendingUp, Users, Gift, Trophy, Store, Plus, User,
    QrCode, Share2, X, Phone, ChevronDown, ChevronUp,
    Calendar, Zap, Star, Search, MapPin, Clock, Check,
    Info, Instagram, Download, Copy, LogOut, ChevronRight, ArrowLeft,
    Facebook, Youtube, MessageSquare, Upload, Camera, Navigation, CreditCard
} from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import { useOwnerData } from '../../hooks/useOwnerData';
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout';
import { supabase } from '../../lib/supabase';

const P = '#900A12';
const P10 = 'rgba(144,10,18,0.1)';
type TabType = 'overview' | 'customers' | 'rewards' | 'settings';

// ─── Real QR Code (via public API, no extra library needed) ───────────────────
function QRImage({ value, size = 160 }: { value: string; size?: number }) {
    const encoded = encodeURIComponent(value);
    const uri = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10&qzone=1`;
    return (
        <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: 8 }}
            resizeMode="contain"
        />
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ restaurant, rewards, stats, pendingScans, refetch, subDetails, onUpgrade }: any) {
    const scanUrl = `https://druto.me/scan/${restaurant?.slug || restaurant?.id}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(scanUrl)}&margin=10`;
    const posterRef = useRef<ViewShot>(null);

    const capturePoster = async (action: 'share' | 'download') => {
        try {
            if (!posterRef.current || !posterRef.current.capture) return;
            // Introduce a small delay to ensure rendering is ready if needed, though usually react-native-view-shot is synchronous enough if rendered
            const uri = await posterRef.current.capture();
            if (action === 'share') {
                await Sharing.shareAsync(uri, { dialogTitle: `Share ${restaurant.name} QR Code` });
            } else {
                await Sharing.shareAsync(uri, { UTI: 'public.image' });
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to generate poster');
        }
    };

    const handleCopy = () => Alert.alert('Link Copied', scanUrl);

    const handleApproveScan = async (scanId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/manage-scan-approval`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ scanId, ownerId: user?.id, action: 'accept' })
            });
            const result = await res.json();
            if (result.success) { refetch(); Alert.alert('✓ Approved', 'Scan approved!'); }
            else Alert.alert('Error', result.error || 'Failed to approve');
        } catch { Alert.alert('Error', 'Failed to approve'); }
    };

    const handleDeclineScan = async (scanId: string) => {
        Alert.alert('Decline Scan', 'Are you sure you want to decline this scan?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Decline', style: 'destructive', onPress: async () => {
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const user = session?.user;
                        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/manage-scan-approval`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                                Authorization: `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({ scanId, ownerId: user?.id, action: 'decline' })
                        });
                        const result = await res.json();
                        if (result.success) { refetch(); Alert.alert('Declined', 'Scan declined.'); }
                        else Alert.alert('Error', result.error || 'Failed to decline');
                    } catch { Alert.alert('Error', 'Failed to decline'); }
                }
            },
        ]);
    };

    const reward = rewards?.[0];
    const isTrial = subDetails?.status !== 'active';

    return (
        <View style={{ gap: 16 }}>
            {isTrial && (
                <TouchableOpacity
                    onPress={onUpgrade}
                    style={{
                        backgroundColor: '#FFFBEB',
                        borderWidth: 1,
                        borderColor: '#FEF3C7',
                        borderRadius: 16,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12
                    }}
                >
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={20} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontVariant: ['small-caps'], fontWeight: '700', color: '#92400E' }}>Trial Period Active</Text>
                        <Text style={{ fontSize: 12, color: '#B45309' }}>Start your subscription now to avoid service interruption.</Text>
                    </View>
                    <ChevronRight size={18} color="#D97706" />
                </TouchableOpacity>
            )}
            {/* Hidden Poster for Capture */}
            <View style={{ position: 'absolute', left: -10000, top: 0 }}>
                <ViewShot ref={posterRef} options={{ format: 'jpg', quality: 1 }}>
                    <ImageBackground
                        source={require('../../assets/images/qr-poster-template.jpg')}
                        style={{ width: 800, height: 1200 }}
                    >
                        {/* QR Code positioned exactly in the top white box (y=430 to 878) */}
                        <View style={{
                            position: 'absolute',
                            left: 174,
                            top: 430,
                            width: 450,
                            height: 448,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <View style={{ backgroundColor: 'white', padding: 12 }}>
                                <QRImage value={scanUrl} size={380} />
                            </View>
                        </View>

                        {/* Restaurant Name exactly in the bottom white pill (y=928 to 1010) */}
                        <View style={{
                            position: 'absolute',
                            left: 182,
                            top: 928,
                            width: 442,
                            height: 82,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 10,
                        }}>
                            <Text
                                style={{
                                    fontSize: 44,
                                    fontWeight: '800',
                                    color: '#7a1a1a',
                                    textAlign: 'center'
                                }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                                {restaurant.name}
                            </Text>
                        </View>
                    </ImageBackground>
                </ViewShot>
            </View>

            {pendingScans?.length > 0 && (
                <View style={card}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>⏳ Pending Approvals ({pendingScans.length})</Text>
                    {pendingScans.map((s: any) => (
                        <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                            <View>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{s.customerName || 'Customer'}</Text>
                                <Text style={{ fontSize: 12, color: '#6B7280' }}>{s.customerPhone || ''}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    onPress={() => handleApproveScan(s.id)}
                                    style={{ backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                                >
                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDeclineScan(s.id)}
                                    style={{ borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                                >
                                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Decline</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* QR Code — real QR from API */}
            <View style={card}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Your QR Code</Text>
                <View style={{ alignItems: 'center' }}>
                    <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }}>
                        <QRImage value={scanUrl} size={160} />
                    </View>
                    <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>Display at your counter for customers to scan</Text>
                    <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                        <TouchableOpacity onPress={handleCopy} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 }}>
                            <Copy size={16} color="#374151" />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Copy Link</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => capturePoster('download')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', gap: 6 }}>
                            <Download size={16} color="#374151" />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Download</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => capturePoster('share')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, backgroundColor: P, gap: 6 }}>
                            <Share2 size={16} color="white" />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {reward && (
                <View style={[card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: P10, alignItems: 'center', justifyContent: 'center' }}>
                        <Gift size={24} color={P} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: P, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Current Reward</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{reward.name || reward.description}</Text>
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>{reward.stampsRequired} visits • {reward.expiryDays || 30} day expiry</Text>
                    </View>
                </View>
            )}

            <View style={card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Today's Activity</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Calendar size={14} color="#6B7280" />
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, alignItems: 'center' }}>
                        <Zap size={20} color="#16A34A" style={{ marginBottom: 8 }} />
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#16A34A' }}>{stats?.todayScans || 0}</Text>
                        <Text style={{ fontSize: 11, color: '#15803D', fontWeight: '500', marginTop: 2 }}>Scans Today</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#FEFCE8', borderRadius: 16, padding: 16, alignItems: 'center' }}>
                        <Star size={20} color="#CA8A04" style={{ marginBottom: 8 }} />
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#CA8A04' }}>{stats?.completedCards || 0}</Text>
                        <Text style={{ fontSize: 11, color: '#A16207', fontWeight: '500', marginTop: 2 }}>Completed</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

// ─── Customers Tab ────────────────────────────────────────────────────────────
function CustomersTab({ customers }: any) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [renderLimit, setRenderLimit] = useState(20);

    const filtered = (customers || []).filter((c: any) => {
        const m = !search || (c.phone || '').includes(search) || (c.name || '').toLowerCase().includes(search.toLowerCase());
        const f = filter === 'all' || (filter === 'active' && c.totalVisits < c.stampsRequired) || (filter === 'completed' && c.totalVisits >= c.stampsRequired);
        return m && f;
    });

    return (
        <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 }}>
                <Search size={18} color="#9CA3AF" />
                <TextInput placeholder="Search by phone or name..." placeholderTextColor="#9CA3AF" value={search} onChangeText={setSearch} style={{ flex: 1, fontSize: 14, color: '#111827' }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['all', 'active', 'completed'] as const).map(f => (
                    <TouchableOpacity key={f} onPress={() => { setFilter(f); setRenderLimit(20); }} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: filter === f ? P : '#F3F4F6' }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: filter === f ? 'white' : '#6B7280', textTransform: 'capitalize' }}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            {filtered.length === 0 ? (
                <View style={[card, { alignItems: 'center', padding: 32 }]}>
                    <Users size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 }}>No customers yet</Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>Share your QR code to start building your customer base</Text>
                </View>
            ) : filtered.slice(0, renderLimit).map((c: any) => (
                <View key={c.id} style={card}>
                    <TouchableOpacity onPress={() => setExpanded(expanded === c.id ? null : c.id)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: P10, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: P }}>{(c.name || 'C').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{c.name || 'Customer'}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Phone size={12} color="#6B7280" />
                                <Text style={{ fontSize: 13, color: '#6B7280' }}>{c.phone || '—'}</Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: P }}>{c.totalVisits}/{c.stampsRequired}</Text>
                            <Text style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>stamps</Text>
                        </View>
                        {expanded === c.id ? <ChevronUp size={20} color="#9CA3AF" /> : <ChevronDown size={20} color="#9CA3AF" />}
                    </TouchableOpacity>
                    {expanded === c.id && (
                        <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 12, paddingTop: 12, gap: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 13, color: '#6B7280' }}>Total Visits</Text>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{c.totalVisits}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 13, color: '#6B7280' }}>Last Visit</Text>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{c.lastVisit || '—'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 13, color: '#6B7280' }}>Status</Text>
                                <View style={{ backgroundColor: c.totalVisits >= c.stampsRequired ? '#F0FDF4' : '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: c.totalVisits >= c.stampsRequired ? '#16A34A' : '#6B7280' }}>
                                        {c.totalVisits >= c.stampsRequired ? 'Completed' : 'Active'}
                                    </Text>
                                </View>
                            </View>

                            {/* Scan History - Parity with WebApp */}
                            {c.scans && c.scans.length > 0 && (
                                <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                        <Calendar size={14} color="#6B7280" />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Scan History</Text>
                                    </View>
                                    <View style={{ gap: 8 }}>
                                        {c.scans.map((scan: any, idx: number) => (
                                            <View key={scan.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                                    <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '600', width: 24 }}>#{c.scans.length - idx}</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{scan.time}</Text>
                                                        {scan.branchName && (
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                                                <Store size={10} color={P} />
                                                                <Text style={{ fontSize: 11, color: P, fontWeight: '500' }}>{scan.branchName}</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                                {scan.locationVerified && <MapPin size={14} color={P} />}
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            ))}
            {filtered.length > renderLimit && (
                <TouchableOpacity onPress={() => setRenderLimit(p => p + 20)} style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: P, fontWeight: '700', fontSize: 14 }}>Load More</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Rewards Tab ──────────────────────────────────────────────────────────────
function RewardsTab({ claimedRewards, refetch }: any) {
    const [filter, setFilter] = useState<'pending' | 'redeemed' | 'all'>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [renderLimit, setRenderLimit] = useState(20);
    const pending = (claimedRewards || []).filter((r: any) => !r.isRedeemed && !r.isExpired).length;
    const redeemed = (claimedRewards || []).filter((r: any) => r.isRedeemed).length;
    const filtered = (claimedRewards || []).filter((r: any) => filter === 'pending' ? (!r.isRedeemed && !r.isExpired) : filter === 'redeemed' ? r.isRedeemed : true);

    const handleManage = async (id: string, action: 'accept' | 'decline') => {
        setProcessingId(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/manage-claimed-reward`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ claimedRewardId: id, ownerId: user?.id, action }),
            });
            const result = await res.json();
            if (result.success) { Alert.alert(action === 'accept' ? '🎉 Accepted!' : 'Declined', ''); refetch(); }
            else Alert.alert('Error', result.error || `Failed`);
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setProcessingId(null); }
    };

    return (
        <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <Gift size={20} color="#2563EB" />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A8A', marginBottom: 4 }}>Claimed Rewards Only</Text>
                    <Text style={{ fontSize: 12, color: '#3B82F6', lineHeight: 18 }}>Accept here when giving customers their reward.</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {[{ k: 'pending', l: 'Pending', c: pending }, { k: 'redeemed', l: 'Redeemed', c: redeemed }, { k: 'all', l: 'All', c: (claimedRewards || []).length }].map(f => (
                    <TouchableOpacity key={f.k} onPress={() => { setFilter(f.k as any); setRenderLimit(20); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: filter === f.k ? P : '#F3F4F6' }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: filter === f.k ? 'white' : '#6B7280' }}>{f.l}</Text>
                        <Text style={{ fontSize: 11, color: filter === f.k ? 'rgba(255,255,255,0.8)' : '#9CA3AF' }}>{f.c}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            {filtered.length === 0 ? (
                <View style={[card, { alignItems: 'center', padding: 32 }]}>
                    <Gift size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{filter === 'pending' ? 'No pending rewards' : 'No rewards yet'}</Text>
                </View>
            ) : filtered.slice(0, renderLimit).map((r: any) => (
                <View key={r.id} style={[card, { opacity: r.isRedeemed ? 0.75 : 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: r.isRedeemed ? '#DCFCE7' : r.isExpired ? '#FEE2E2' : P10 }}>
                            {r.isRedeemed ? <Check size={24} color="#16A34A" /> : <Gift size={24} color={P} />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }} numberOfLines={1}>{r.rewardName || 'Reward'}</Text>
                            <Text style={{ fontSize: 13, color: '#6B7280' }}>{r.customerPhone || '—'}</Text>
                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{r.claimedAt ? new Date(r.claimedAt).toLocaleDateString() : ''}</Text>
                        </View>
                        <View style={{ flexShrink: 0 }}>
                            {!r.isRedeemed && !r.isExpired && (
                                <View style={{ gap: 6 }}>
                                    <TouchableOpacity onPress={() => handleManage(r.id, 'accept')} disabled={processingId === r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                                        {processingId === r.id ? <ActivityIndicator size="small" color="white" /> : <Check size={14} color="white" />}
                                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Accept</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleManage(r.id, 'decline')} disabled={processingId === r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                                        <X size={12} color="#EF4444" />
                                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Decline</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {r.isRedeemed && <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Accepted</Text></View>}
                            {r.isExpired && !r.isRedeemed && <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>Expired</Text></View>}
                        </View>
                    </View>
                </View>
            ))}
            {filtered.length > renderLimit && (
                <TouchableOpacity onPress={() => setRenderLimit(p => p + 20)} style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: P, fontWeight: '700', fontSize: 14 }}>Load More</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ restaurant, rewards, refetch, subDetails, onUpgrade }: any) {
    const r = rewards?.[0];
    const [visits, setVisits] = useState(String(r?.stampsRequired || 10));
    const [desc, setDesc] = useState(r?.description || r?.name || 'Free coffee of your choice');
    const [expiry, setExpiry] = useState(String(r?.expiryDays || 30));
    const [rewardImageUrl, setRewardImageUrl] = useState(r?.rewardImageUrl || '');
    const [reviewUrl, setReviewUrl] = useState(restaurant?.googleReviewUrl || '');
    const [open, setOpen] = useState(restaurant?.openingHours?.open || '09:00');
    const [close, setClose] = useState(restaurant?.openingHours?.close || '21:00');
    const [instagram, setInstagram] = useState(restaurant?.socialLinks?.instagram || '');
    const [facebook, setFacebook] = useState(restaurant?.socialLinks?.facebook || '');
    const [youtube, setYoutube] = useState(restaurant?.socialLinks?.youtube || '');
    const [googleReviewText, setGoogleReviewText] = useState(restaurant?.socialLinks?.google_review_text || '');
    const [saving, setSaving] = useState(false);
    const [savingSocials, setSavingSocials] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        if (r) { setVisits(String(r.stampsRequired || 10)); setDesc(r.description || r.name || ''); setExpiry(String(r.expiryDays || 30)); setRewardImageUrl(r.rewardImageUrl || ''); }
        if (restaurant) {
            setReviewUrl(restaurant.googleReviewUrl || ''); setOpen(restaurant.openingHours?.open || '09:00'); setClose(restaurant.openingHours?.close || '21:00');
            setInstagram(restaurant?.socialLinks?.instagram || '');
            setFacebook(restaurant?.socialLinks?.facebook || '');
            setYoutube(restaurant?.socialLinks?.youtube || '');
            setGoogleReviewText(restaurant?.socialLinks?.google_review_text || '');
        }
    }, [r, restaurant]);

    const inp = { height: 44, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: '#111827', backgroundColor: 'white' } as const;
    const lbl = { fontSize: 13, fontWeight: '600' as const, color: '#374151', marginBottom: 6 };

    const handleUploadImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
            if (!result.canceled && result.assets[0].base64) {
                setUploadingImage(true);
                const fileExt = result.assets[0].uri.split('.').pop();
                const fileName = `${restaurant.id}/${Date.now()}.${fileExt}`;
                const { data, error } = await supabase.storage.from('images').upload(`rewards/${fileName}`, decode(result.assets[0].base64), { contentType: `image/${fileExt}`, upsert: true });
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`rewards/${fileName}`);
                setRewardImageUrl(publicUrl);
                Alert.alert('Success', 'Image uploaded successfully!');
            }
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setUploadingImage(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/save-reward-config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ restaurantId: restaurant.id, rewardId: r?.id || null, userId: user?.id, visitsRequired: parseInt(visits) || 10, rewardDescription: desc, expiryDays: parseInt(expiry) || 30, rewardImageUrl, googleReviewUrl: reviewUrl, openingHours: { open, close } }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.error || 'Failed');
            Alert.alert('✓ Saved!', 'Reward program updated.'); refetch();
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setSaving(false); }
    };

    const handleSaveSocials = async () => {
        setSavingSocials(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-restaurant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ restaurantId: restaurant.id, field: 'social_links', value: { instagram, facebook, youtube, google_review_text: googleReviewText }, userId: user?.id }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.error || 'Failed');
            Alert.alert('✓ Saved!', 'Social links updated.');
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setSavingSocials(false); }
    };

    const isTrial = subDetails?.status !== 'active';

    return (
        <View style={{ gap: 16 }}>
            {isTrial && (
                <TouchableOpacity
                    onPress={onUpgrade}
                    style={{
                        backgroundColor: '#FFFBEB',
                        borderWidth: 1,
                        borderColor: '#FEF3C7',
                        borderRadius: 16,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12
                    }}
                >
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={20} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontVariant: ['small-caps'], fontWeight: '700', color: '#92400E' }}>Trial Period Active</Text>
                        <Text style={{ fontSize: 12, color: '#B45309' }}>Start your subscription now to avoid service interruption.</Text>
                    </View>
                    <ChevronRight size={18} color="#D97706" />
                </TouchableOpacity>
            )}
            <View style={card}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 20 }}>{rewards?.length > 0 ? 'Edit Reward Program' : 'Create Your Reward Program'}</Text>
                <View style={{ gap: 16 }}>
                    <View><Text style={lbl}>Visits Required</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TextInput value={visits} onChangeText={setVisits} keyboardType="number-pad" style={[inp, { width: 80, textAlign: 'center' }]} />
                            <Text style={{ fontSize: 13, color: '#6B7280' }}>visits for reward</Text>
                        </View>
                    </View>
                    <View><Text style={lbl}>Reward Description</Text>
                        <TextInput value={desc} onChangeText={setDesc} placeholder="e.g., Free coffee" placeholderTextColor="#9CA3AF" style={inp} />
                    </View>
                    <View><Text style={lbl}>Reward Expiry</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TextInput value={expiry} onChangeText={setExpiry} keyboardType="number-pad" style={[inp, { width: 80, textAlign: 'center' }]} />
                            <Text style={{ fontSize: 13, color: '#6B7280' }}>days after claim</Text>
                        </View>
                    </View>
                    <View><Text style={lbl}>Reward Image</Text>
                        <TouchableOpacity onPress={handleUploadImage} disabled={uploadingImage} style={{ height: 120, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: rewardImageUrl ? 'transparent' : '#D1D5DB', backgroundColor: '#F9FAFB', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                            {rewardImageUrl ? (
                                <View style={{ width: '100%', height: '100%' }}>
                                    <Image source={{ uri: rewardImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>Change Option</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    {uploadingImage ? <ActivityIndicator size="large" color={P} /> : <><Upload size={24} color="#9CA3AF" /><Text style={{ marginTop: 8, color: '#6B7280', fontSize: 13, fontWeight: '500' }}>Tap to upload image</Text></>}
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                    {/* Preview */}
                    <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 }}>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 10 }}>Preview</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', padding: 12, borderRadius: 12 }}>
                            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: P10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {rewardImageUrl ? <Image source={{ uri: rewardImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Gift size={24} color={P} />}
                            </View>
                            <View><Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{desc || 'Your reward'}</Text><Text style={{ fontSize: 12, color: '#6B7280' }}>{visits} visits • {expiry} days</Text></View>
                        </View>
                    </View>
                    <View><Text style={lbl}>Google Review Link</Text>
                        <TextInput value={reviewUrl} onChangeText={setReviewUrl} placeholder="https://g.page/r/.../review" placeholderTextColor="#9CA3AF" autoCapitalize="none" style={inp} />
                    </View>
                    <View><Text style={lbl}>Opening Hours</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Opens</Text>
                                <View style={[inp, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}><Clock size={16} color="#9CA3AF" /><TextInput value={open} onChangeText={setOpen} style={{ flex: 1, fontSize: 14, color: '#111827' }} /></View>
                            </View>
                            <View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Closes</Text>
                                <View style={[inp, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}><Clock size={16} color="#9CA3AF" /><TextInput value={close} onChangeText={setClose} style={{ flex: 1, fontSize: 14, color: '#111827' }} /></View>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleSave} disabled={saving} style={{ height: 48, borderRadius: 14, backgroundColor: P, alignItems: 'center', justifyContent: 'center' }}>
                        {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Save Changes</Text>}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={card}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Social Media Links</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>Add your social profiles. They'll appear on your restaurant page as deep links.</Text>
                <View style={{ gap: 12 }}>
                    <View><Text style={lbl}>Instagram</Text>
                        <View style={[inp, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                            <Instagram size={16} color="#9CA3AF" />
                            <TextInput value={instagram} onChangeText={setInstagram} placeholder="https://instagram.com/yourpage" placeholderTextColor="#9CA3AF" autoCapitalize="none" style={{ flex: 1, fontSize: 14, color: '#111827' }} />
                        </View>
                    </View>
                    <View><Text style={lbl}>Facebook</Text>
                        <View style={[inp, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                            <Facebook size={16} color="#9CA3AF" />
                            <TextInput value={facebook} onChangeText={setFacebook} placeholder="https://facebook.com/yourpage" placeholderTextColor="#9CA3AF" autoCapitalize="none" style={{ flex: 1, fontSize: 14, color: '#111827' }} />
                        </View>
                    </View>
                    <View><Text style={lbl}>YouTube</Text>
                        <View style={[inp, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                            <Youtube size={16} color="#9CA3AF" />
                            <TextInput value={youtube} onChangeText={setYoutube} placeholder="https://youtube.com/@yourchannel" placeholderTextColor="#9CA3AF" autoCapitalize="none" style={{ flex: 1, fontSize: 14, color: '#111827' }} />
                        </View>
                    </View>
                    <View><Text style={lbl}>Suggested Review Text</Text>
                        <View style={[inp, { flexDirection: 'row', alignItems: 'flex-start', gap: 8, height: 80, paddingTop: 10 }]}>
                            <MessageSquare size={16} color="#9CA3AF" style={{ marginTop: 2 }} />
                            <TextInput value={googleReviewText} onChangeText={setGoogleReviewText} placeholder="e.g., Great food, amazing vibes!" placeholderTextColor="#9CA3AF" autoCapitalize="sentences" multiline style={{ flex: 1, fontSize: 14, color: '#111827', textAlignVertical: 'top' }} />
                        </View>
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>This text will be auto-copied to your customer's clipboard.</Text>
                    </View>
                    <TouchableOpacity onPress={handleSaveSocials} disabled={savingSocials} style={{ height: 48, borderRadius: 14, backgroundColor: P, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                        {savingSocials ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Save Social Links</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ visible, onClose, restaurant, onSignOut, refetch, subDetails, loadingSub, setSubDetails, branches, initialSection }: any) {
    const [phone, setPhone] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [editSection, setEditSection] = useState<'business' | 'profile' | null>(null);
    const [savingBiz, setSavingBiz] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingRemote, setSavingRemote] = useState(false);
    const [settingsSection, setSettingsSection] = useState<'notifications' | 'privacy' | 'support' | 'subscription' | 'locations' | null>(null);

    useEffect(() => {
        if (visible) {
            if (initialSection === 'subscription') {
                setSettingsSection('subscription');
                setEditSection(null);
            } else if (initialSection === 'business') {
                setEditSection('business');
                setSettingsSection(null);
            }
        } else {
            // Reset when closing
            setSettingsSection(null);
            setEditSection(null);
        }
    }, [visible, initialSection]);

    // Reusable Switch Component
    const ToggleSwitch = ({ value, onToggle, disabled }: any) => (
        <Switch
            value={value}
            onValueChange={onToggle}
            disabled={disabled}
            trackColor={{ false: '#D1D5DB', true: `${P}80` }}
            thumbColor={value ? P : '#F3F4F6'}
        />
    );

    // Business edit state
    const [bizName, setBizName] = useState('');
    const [bizPhone, setBizPhone] = useState('');
    const [bizEmail, setBizEmail] = useState('');
    const [bizAddress, setBizAddress] = useState('');
    const [bizCategory, setBizCategory] = useState<string>('cafe');
    const [bizDescription, setBizDescription] = useState('');
    const [bizLat, setBizLat] = useState<number | null>(null);
    const [bizLng, setBizLng] = useState<number | null>(null);
    const [bizOpen, setBizOpen] = useState('09:00');
    const [bizClose, setBizClose] = useState('21:00');
    const [gettingLocation, setGettingLocation] = useState(false);

    // Notifications state
    const [notif, setNotif] = useState({ push: true, email: false, rewards: true, customers: true });

    // Privacy state  
    const [privacy, setPrivacy] = useState({ shareLocation: true, analytics: true });

    // Support form
    const [support, setSupport] = useState({ name: '', email: '', subject: '', message: '' });
    const [sendingSupport, setSendingSupport] = useState(false);
    const [addingBranch, setAddingBranch] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [newBranchLat, setNewBranchLat] = useState<number | null>(null);
    const [newBranchLng, setNewBranchLng] = useState<number | null>(null);
    const [gettingBranchLoc, setGettingBranchLoc] = useState(false);

    // Subscription
    const [localLoadingSub, setLocalLoadingSub] = useState(false);
    const { initiateSubscription, isLoading: isPaymentLoading } = useRazorpayCheckout();

    useEffect(() => {
        if (!subDetails && visible && settingsSection === 'subscription') {
            // This is handled by parent now, but keeping it flexible
        }
    }, [settingsSection, visible]);

    useEffect(() => {
        const initForm = async () => {
            if (!visible || !restaurant) return;
            const { data: { user } } = await supabase.auth.getUser();
            setPhone(user?.phone || '');
            setOwnerName(restaurant.ownerName || '');
            setBizName(restaurant.name || '');
            setBizPhone(restaurant.phone || '');
            setBizEmail(restaurant.email || '');
            setBizAddress(restaurant.address || '');
            setBizCategory(restaurant.category || 'cafe');
            setBizDescription(restaurant.description || '');
            setBizLat(restaurant.latitude || null);
            setBizLng(restaurant.longitude || null);

            if (restaurant.opening_hours) {
                const oh = typeof restaurant.opening_hours === 'string' ? JSON.parse(restaurant.opening_hours) : restaurant.opening_hours;
                setBizOpen(oh.open || '09:00');
                setBizClose(oh.close || '21:00');
            }
        };
        initForm();
    }, [visible]); // ONLY run when modal opens, not on every restaurant prop change

    const formatHours = (h: any) => {
        if (!h) return 'Not set';
        if (typeof h === 'string') {
            try {
                const parsed = JSON.parse(h);
                return `${parsed.open || '09:00'} – ${parsed.close || '21:00'}`;
            } catch { return h; }
        }
        if (h.open || h.close) return `${h.open || '09:00'} – ${h.close || '21:00'}`;
        return 'Not set';
    };

    const getCategoryIcon = (cat: string) => {
        const m: Record<string, string> = { cafe: '☕', restaurant: '🍽️', bakery: '🥐', bar: '🍺', salon: '💇', gym: '🏋️', retail: '🛍️', other: '📦' };
        return m[cat] || '🏪';
    };

    const handleSaveBusiness = async () => {
        setSavingBiz(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-restaurant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    ownerId: user?.id,
                    name: bizName,
                    category: bizCategory,
                    address: bizAddress,
                    phone: bizPhone,
                    email: bizEmail,
                    description: bizDescription,
                    latitude: bizLat,
                    longitude: bizLng,
                    openingHours: { open: bizOpen, close: bizClose }
                }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.error || 'Failed to save');
            Alert.alert('✓ Saved', 'Business info updated!');
            setEditSection(null);
            refetch?.();
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setSavingBiz(false); }
    };

    const handleGetCurrentLocation = async () => {
        setGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Allow location access to use this feature.');
                return;
            }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setBizLat(location.coords.latitude);
            setBizLng(location.coords.longitude);

            const geocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            if (geocode.length > 0) {
                const addr = geocode[0];
                const fullAddress = [addr.name, addr.street, addr.city, addr.region, addr.postalCode].filter(Boolean).join(', ');
                setBizAddress(fullAddress);
            } else {
                Alert.alert('Address Not Found', 'Could not determine address for your location.');
            }
        } catch (e: any) {
            Alert.alert('Error', 'Failed to get location. ' + e.message);
        } finally {
            setGettingLocation(false);
        }
    };

    const handleToggleRemoteScan = async (val: boolean) => {
        setSavingRemote(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            const current = restaurant?.socialLinks || {};
            const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-restaurant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ restaurantId: restaurant?.id, field: 'social_links', value: { ...current, allow_remote_scan: val }, userId: user?.id }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.error || 'Failed');
            refetch?.();
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setSavingRemote(false); }
    };

    const handleSendSupport = async () => {
        if (!support.name.trim() || !support.email.trim() || !support.message.trim()) {
            Alert.alert('Required', 'Please fill in Name, Email and Message.');
            return;
        }
        setSendingSupport(true);
        try {
            const subject = encodeURIComponent(support.subject || 'Business Support Request');
            const body = encodeURIComponent(`Name: ${support.name}\nEmail: ${support.email}\n\nMessage:\n${support.message}`);
            await Linking.openURL(`mailto:support@druto.me?subject=${subject}&body=${body}`);
            setSupport({ name: '', email: '', subject: '', message: '' });
            setSettingsSection(null);
        } catch { Alert.alert('Error', 'Could not open email client'); }
        finally { setSendingSupport(false); }
    };

    const inp = { height: 46, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: '#111827', backgroundColor: 'white' } as const;
    const lbl = { fontSize: 13, fontWeight: '600' as const, color: '#374151', marginBottom: 6 };

    const isRemoteScan = restaurant?.socialLinks?.allow_remote_scan === true;

    // Settings sub-sections render
    const renderSettings = () => {
        if (settingsSection === 'notifications') return (
            <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Notifications</Text>
                <View style={card}>
                    {[['Push Notifications', 'push', 'Receive alerts on your device'], ['Email Notifications', 'email', 'Get updates via email'], ['Reward Alerts', 'rewards', 'When customers claim rewards'], ['Customer Alerts', 'customers', 'When new customers visit']].map(([label, key, desc]) => (
                        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{label}</Text>
                                <Text style={{ fontSize: 12, color: '#6B7280' }}>{desc}</Text>
                            </View>
                            <ToggleSwitch value={(notif as any)[key]} onToggle={(v: boolean) => setNotif(p => ({ ...p, [key]: v }))} />
                        </View>
                    ))}
                </View>
                <TouchableOpacity onPress={() => setSettingsSection(null)} style={{ height: 48, borderRadius: 14, backgroundColor: P, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Save Settings</Text>
                </TouchableOpacity>
            </View>
        );
        if (settingsSection === 'privacy') return (
            <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Privacy & Security</Text>
                <View style={card}>
                    {[['Share Location', 'shareLocation', 'For business location services'], ['Analytics', 'analytics', 'Help improve the app']].map(([label, key, desc]) => (
                        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{label}</Text>
                                <Text style={{ fontSize: 12, color: '#6B7280' }}>{desc}</Text>
                            </View>
                            <ToggleSwitch value={(privacy as any)[key]} onToggle={(v: boolean) => setPrivacy(p => ({ ...p, [key]: v }))} />
                        </View>
                    ))}
                </View>
                <View style={[card, { gap: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <Info size={18} color={P} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Data Protection</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 20 }}>Your business data is encrypted and securely stored. We never share your information with third parties without your consent.</Text>
                </View>
                <TouchableOpacity onPress={() => setSettingsSection(null)} style={{ height: 48, borderRadius: 14, backgroundColor: P, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Save Settings</Text>
                </TouchableOpacity>
            </View>
        );

        const handleAddBranch = async () => {
            if (!newBranchName || newBranchLat === null || newBranchLng === null) {
                Alert.alert('Error', 'Please enter a name and pick a location.');
                return;
            }
            try {
                setAddingBranch(true);
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                if (!user) return;

                const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/manage-branches`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                        Authorization: `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        action: 'create',
                        restaurantId: restaurant.id,
                        userId: user.id,
                        branchData: { name: newBranchName, latitude: newBranchLat, longitude: newBranchLng }
                    }),
                });

                const data = await response.json();
                if (!response.ok || !data?.success) throw new Error(data?.error || 'Failed to add branch');

                Alert.alert('Success', 'New location added successfully!');
                setNewBranchName('');
                setNewBranchLat(null);
                setNewBranchLng(null);
                refetch();
            } catch (e: any) {
                Alert.alert('Error', e.message);
            } finally {
                setAddingBranch(false);
            }
        };

        const handleDeleteBranch = async (branchId: string) => {
            Alert.alert('Delete Location', 'Are you sure you want to remove this location?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const user = session?.user;
                            if (!user) return;
                            const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/manage-branches`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                                    Authorization: `Bearer ${session?.access_token}`
                                },
                                body: JSON.stringify({ action: 'delete', restaurantId: restaurant.id, userId: user.id, branchId }),
                            });
                            const data = await response.json();
                            if (!response.ok || !data?.success) throw new Error(data?.error || 'Failed to delete branch');
                            refetch();
                        } catch (e: any) { Alert.alert('Error', e.message); }
                    }
                }
            ]);
        };

        const getBranchLoc = async () => {
            try {
                setGettingBranchLoc(true);
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission Denied', 'Allow location access to pick this spot.'); return; }
                const loc = await Location.getCurrentPositionAsync({});
                setNewBranchLat(loc.coords.latitude);
                setNewBranchLng(loc.coords.longitude);
            } catch (e: any) { Alert.alert('Error', 'Could not get location.'); }
            finally { setGettingBranchLoc(false); }
        };

        if (settingsSection === 'locations') {
            const plan = subDetails?.plan_tier || 'starter';
            const limit = plan === 'pro' ? 6 : plan === 'growth' ? 3 : 1;
            const currentCount = (branches?.length || 0) + 1; // +1 for main restaurant

            return (
                <View style={{ gap: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Manage Locations</Text>
                    <View style={[card, { gap: 14 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>LOCATIONS ({currentCount}/{limit})</Text>
                            {plan === 'starter' && <TouchableOpacity onPress={() => setSettingsSection('subscription')}><Text style={{ fontSize: 12, color: P, fontWeight: '600' }}>Upgrade for more</Text></TouchableOpacity>}
                        </View>

                        {/* Main Restaurant */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: P10, alignItems: 'center', justifyContent: 'center' }}>
                                <Store size={16} color={P} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{restaurant?.name} (Main)</Text>
                                <Text style={{ fontSize: 12, color: '#6B7280' }}>Primary store location</Text>
                            </View>
                        </View>

                        {/* Branches */}
                        {branches?.map((b: any) => (
                            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4FB', alignItems: 'center', justifyContent: 'center' }}>
                                    <MapPin size={16} color="#4B5563" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{b.name}</Text>
                                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{b.latitude?.toFixed(4)}, {b.longitude?.toFixed(4)}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteBranch(b.id)} style={{ padding: 4 }}>
                                    <X size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {currentCount < limit && (
                            <View style={{ marginTop: 8, gap: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>Add New Location</Text>
                                <TextInput value={newBranchName} onChangeText={setNewBranchName} placeholder="Store Nickname (e.g. MG Road Branch)" style={inp} placeholderTextColor="#9CA3AF" />
                                <TouchableOpacity onPress={getBranchLoc} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 }}>
                                    {gettingBranchLoc ? <ActivityIndicator size="small" color={P} /> : <MapPin size={16} color={P} />}
                                    <Text style={{ fontSize: 13, color: newBranchLat ? '#111827' : '#6B7280' }}>
                                        {newBranchLat ? `${newBranchLat.toFixed(4)}, ${newBranchLng?.toFixed(4)}` : 'Get Current GPS Location'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleAddBranch} disabled={addingBranch} style={{ height: 40, backgroundColor: P, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                                    {addingBranch ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Add Branch</Text>}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <View style={[card, { gap: 8 }]}>
                        <Info size={16} color="#6B7280" />
                        <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 18 }}>Customers will be able to get stamps once they are within 50 meters of any of your store locations. Your QR code remains the same for all locations.</Text>
                    </View>
                </View>
            );
        }

        if (settingsSection === 'support') return (
            <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Help & Support</Text>
                <View style={card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: P10, alignItems: 'center', justifyContent: 'center' }}>
                            <Info size={24} color={P} />
                        </View>
                        <View>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Contact Support</Text>
                            <Text style={{ fontSize: 13, color: '#6B7280' }}>We'll get back within 24 hours</Text>
                        </View>
                    </View>
                    <View style={{ gap: 14 }}>
                        <View><Text style={lbl}>Your Name *</Text><TextInput value={support.name} onChangeText={v => setSupport(p => ({ ...p, name: v }))} placeholder="Enter your name" placeholderTextColor="#9CA3AF" style={inp} /></View>
                        <View><Text style={lbl}>Email Address *</Text><TextInput value={support.email} onChangeText={v => setSupport(p => ({ ...p, email: v }))} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" style={inp} /></View>
                        <View><Text style={lbl}>Subject</Text><TextInput value={support.subject} onChangeText={v => setSupport(p => ({ ...p, subject: v }))} placeholder="What's this about?" placeholderTextColor="#9CA3AF" style={inp} /></View>
                        <View><Text style={lbl}>Message *</Text><TextInput value={support.message} onChangeText={v => setSupport(p => ({ ...p, message: v }))} placeholder="Describe your issue..." placeholderTextColor="#9CA3AF" multiline numberOfLines={4} style={[inp, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]} /></View>
                        <TouchableOpacity onPress={handleSendSupport} disabled={sendingSupport} style={{ height: 48, borderRadius: 14, backgroundColor: P, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {sendingSupport ? <ActivityIndicator color="white" size="small" /> : <><Info size={18} color="white" /><Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Send to support@druto.me</Text></>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
        if (settingsSection === 'subscription') {
            const isSubActive = subDetails?.status === 'active';
            const plans = [
                { id: 'starter', name: 'Starter', priceInRupees: 229, features: ['1 store location', 'Unlimited QR scans', 'Custom rewards', 'Analytics dashboard', 'FREE QR code stand'] },
                { id: 'growth', name: 'Growth', priceInRupees: 499, features: ['Up to 3 store locations', 'Same QR, GPS branch detection', 'Branch-wise scan analytics', 'All Starter features', 'Priority support'] },
                { id: 'pro', name: 'Professional', priceInRupees: 999, features: ['Up to 6 store locations', 'Same QR, GPS branch detection', 'Branch-wise scan analytics', 'All Growth features', 'Dedicated account manager'] },
            ];

            const handlePlanSelect = async (tier: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const result = await initiateSubscription(user.id, restaurant.id, undefined, tier);
                if (result.success) {
                    // Force refresh subscription details
                    const { data } = await supabase
                        .from('subscriptions')
                        .select('status, current_period_end, plan_tier, razorpay_plan_id')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    if (data) setSubDetails(data);
                }
            };

            return (
                <View style={{ gap: 12 }}>
                    {loadingSub ? (
                        <View style={[card, { alignItems: 'center', justifyContent: 'center', height: 150 }]}>
                            <ActivityIndicator size="small" color={P} />
                        </View>
                    ) : (
                        <>
                            {isSubActive && (
                                <View style={{ gap: 10, marginBottom: 8 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Current Plan</Text>
                                    <View style={card}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: P10, alignItems: 'center', justifyContent: 'center' }}>
                                                <CreditCard size={20} color={P} />
                                            </View>
                                            <View style={{ backgroundColor: '#DEF7EC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}>
                                                <Text style={{ color: '#03543F', fontSize: 11, fontWeight: '700' }}>Active</Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
                                            {(subDetails.plan_tier === 'pro' || subDetails.razorpay_plan_id === 'plan_SGPdx1HD4uPPQn') ? 'Druto Professional' :
                                                (subDetails.plan_tier === 'growth' || subDetails.razorpay_plan_id === 'plan_SGPdRGGKwsGCpN') ? 'Druto Growth' :
                                                    'Druto Starter'}
                                        </Text>
                                        <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>Your billing is managed via Razorpay Secure.</Text>

                                        {subDetails?.current_period_end && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                                                <Text style={{ fontSize: 12, color: '#6B7280' }}>Renewal Date</Text>
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>{new Date(subDetails.current_period_end).toLocaleDateString()}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 }} />
                                </View>
                            )}

                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                                {isSubActive ? 'Upgrade or Change Plan' : 'Subscription Plans'}
                            </Text>

                            <View style={{ gap: 12 }}>
                                {plans.map(p => {
                                    const isCurrent = subDetails?.plan_tier === p.id && isSubActive;
                                    return (
                                        <View key={p.id} style={[card, { backgroundColor: 'white', borderColor: isCurrent ? P : '#F3F4F6', borderWidth: isCurrent ? 1.5 : 1 }]}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>{p.name}</Text>
                                                        {isCurrent && <View style={{ backgroundColor: P10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}><Text style={{ color: P, fontSize: 10, fontWeight: '700' }}>Current</Text></View>}
                                                    </View>
                                                    <Text style={{ fontSize: 14, color: '#6B7280' }}>₹{p.priceInRupees}/month</Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => handlePlanSelect(p.id)}
                                                    disabled={isPaymentLoading || isCurrent}
                                                    style={{ backgroundColor: isCurrent ? '#F3F4F6' : P, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                                                >
                                                    {isPaymentLoading ? (
                                                        <ActivityIndicator color="white" size="small" />
                                                    ) : (
                                                        <Text style={{ color: isCurrent ? '#9CA3AF' : 'white', fontWeight: '700', fontSize: 13 }}>
                                                            {isCurrent ? 'Current' : isSubActive ? 'Switch' : 'Select'}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                            <View style={{ gap: 6 }}>
                                                {p.features.map(f => (
                                                    <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <Check size={14} color="#16A34A" />
                                                        <Text style={{ fontSize: 12, color: '#4B5563' }}>{f}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </View>
            );
        }
        return null;
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                {/* Header */}
                <View style={{ backgroundColor: P, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        {(editSection || settingsSection) ? (
                            <TouchableOpacity onPress={() => { setEditSection(null); setSettingsSection(null); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <ArrowLeft size={20} color="white" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 17, fontWeight: '700', color: 'white' }}>
                                {settingsSection === 'notifications' ? 'Notifications' :
                                    settingsSection === 'privacy' ? 'Privacy & Security' :
                                        settingsSection === 'support' ? 'Help & Support' :
                                            settingsSection === 'subscription' ? 'Subscription' :
                                                editSection === 'business' ? 'Edit Business' :
                                                    editSection === 'profile' ? 'Edit Profile' :
                                                        'Profile & Settings'}
                            </Text>
                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                                {settingsSection ? 'Manage preferences' : 'Manage your business and account'}
                            </Text>
                        </View>
                    </View>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

                    {/* SUB-SECTION CONTENT */}
                    {(editSection || settingsSection) ? (
                        <View style={{ gap: 14 }}>
                            {renderSettings()}
                            {/* Business Edit Form */}
                            {editSection === 'business' && (
                                <View style={{ gap: 14 }}>
                                    {/* Business Name */}
                                    <View>
                                        <Text style={lbl}>Business Name</Text>
                                        <TextInput
                                            value={bizName}
                                            onChangeText={setBizName}
                                            placeholderTextColor="#9CA3AF"
                                            style={inp}
                                        />
                                    </View>
                                    {/* Category */}
                                    <View>
                                        <Text style={lbl}>Category</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                                            {[['cafe', '☕ Café'], ['restaurant', '🍽️ Restaurant'], ['bakery', '🥐 Bakery'], ['bar', '🍺 Bar'], ['salon', '💇 Salon'], ['gym', '🏋️ Gym'], ['retail', '🛍️ Retail'], ['other', '📦 Other']].map(([val, label]) => (
                                                <TouchableOpacity key={val} onPress={() => setBizCategory(val)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, marginRight: 8, backgroundColor: bizCategory === val ? P : '#F3F4F6', borderWidth: 1, borderColor: bizCategory === val ? P : '#E5E7EB' }}>
                                                    <Text style={{ fontSize: 13, color: bizCategory === val ? 'white' : '#374151', fontWeight: '500' }}>{label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                    {/* Description */}
                                    <View>
                                        <Text style={lbl}>Description</Text>
                                        <TextInput
                                            value={bizDescription}
                                            onChangeText={setBizDescription}
                                            placeholder="Tell customers about your business..."
                                            placeholderTextColor="#9CA3AF"
                                            multiline
                                            numberOfLines={3}
                                            style={[inp, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                                        />
                                    </View>
                                    {/* Phone */}
                                    <View>
                                        <Text style={lbl}>Phone</Text>
                                        <TextInput
                                            value={bizPhone}
                                            onChangeText={setBizPhone}
                                            keyboardType="phone-pad"
                                            placeholderTextColor="#9CA3AF"
                                            style={inp}
                                        />
                                    </View>
                                    {/* Email */}
                                    <View>
                                        <Text style={lbl}>Email</Text>
                                        <TextInput
                                            value={bizEmail}
                                            onChangeText={setBizEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            placeholderTextColor="#9CA3AF"
                                            style={inp}
                                        />
                                    </View>
                                    {/* Open/Close Hours */}
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={lbl}>Opens At</Text>
                                            <TextInput
                                                value={bizOpen}
                                                onChangeText={setBizOpen}
                                                placeholder="09:00 AM"
                                                placeholderTextColor="#9CA3AF"
                                                style={inp}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={lbl}>Closes At</Text>
                                            <TextInput
                                                value={bizClose}
                                                onChangeText={setBizClose}
                                                placeholder="09:00 PM"
                                                placeholderTextColor="#9CA3AF"
                                                style={inp}
                                            />
                                        </View>
                                    </View>
                                    {/* Address */}
                                    <View>
                                        <Text style={lbl}>Full Address</Text>
                                        <TextInput
                                            value={bizAddress}
                                            onChangeText={setBizAddress}
                                            placeholder="Shop name, Street, City..."
                                            placeholderTextColor="#9CA3AF"
                                            multiline
                                            numberOfLines={2}
                                            style={[inp, { height: 60, paddingTop: 10 }]}
                                        />
                                    </View>
                                    <TouchableOpacity onPress={handleGetCurrentLocation} disabled={gettingLocation} style={{ height: 44, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: -4 }}>
                                        {gettingLocation ? <ActivityIndicator size="small" color="#374151" /> : (
                                            <>
                                                <Navigation size={16} color="#374151" />
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Use Current Location</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleSaveBusiness} disabled={savingBiz} style={{ height: 48, borderRadius: 14, backgroundColor: P, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                                        {savingBiz ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Save Business Info</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}
                            {editSection === 'profile' && (
                                <View style={{ gap: 14 }}>
                                    <View><Text style={lbl}>Your Name</Text><TextInput value={ownerName} onChangeText={setOwnerName} placeholder="Owner name" placeholderTextColor="#9CA3AF" style={inp} /></View>
                                    <View><Text style={lbl}>Phone Number</Text><TextInput value={phone} editable={false} style={[inp, { backgroundColor: '#F9FAFB', color: '#9CA3AF' }]} /></View>
                                    <TouchableOpacity style={{ height: 48, borderRadius: 14, backgroundColor: P, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Save Profile</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={{ gap: 14 }}>
                            {/* ── Business Card */}
                            <View style={card}>
                                {/* Logo + name + edit button */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                                    <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: P10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {restaurant?.logoUrl
                                            ? <Image source={{ uri: restaurant.logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            : <Text style={{ fontSize: 24 }}>{getCategoryIcon(restaurant?.category)}</Text>}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>{restaurant?.name || 'My Business'}</Text>
                                        <Text style={{ fontSize: 13, color: '#6B7280', textTransform: 'capitalize' }}>{restaurant?.category || 'Business'}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setEditSection('business')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: '#E5E7EB' }}>
                                        <Info size={14} color="#374151" />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Edit</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* ── Business Detail Cards */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {[
                                    { icon: <Phone size={18} color={P} />, bg: P10, label: 'Phone', val: restaurant?.phone || 'Not set' },
                                    { icon: <Info size={18} color="#3B82F6" />, bg: '#EFF6FF', label: 'Email', val: restaurant?.email || 'Not set' },
                                    { icon: <MapPin size={18} color="#16A34A" />, bg: '#F0FDF4', label: 'Address', val: restaurant?.address || 'Not set' },
                                    { icon: <Clock size={18} color="#D97706" />, bg: '#FEF3C7', label: 'Hours', val: formatHours(restaurant?.openingHours) },
                                ].map(({ icon, bg, label, val }) => (
                                    <View key={label} style={{ width: '48%', backgroundColor: 'white', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{icon}</View>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{label}</Text>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={2}>{val}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* ── Remote Scan Toggle */}
                            <View style={[card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' }}>
                                        <Info size={20} color="#7C3AED" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Allow Remote Scan</Text>
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>Customers can scan from far away</Text>
                                    </View>
                                </View>
                                <ToggleSwitch value={isRemoteScan} onToggle={handleToggleRemoteScan} disabled={savingRemote} />
                            </View>

                            {/* ── Owner Account */}
                            <View style={card}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: P10, alignItems: 'center', justifyContent: 'center' }}>
                                            <Store size={22} color={P} />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{ownerName || 'Owner'}</Text>
                                            <Text style={{ fontSize: 13, color: '#6B7280' }}>Owner Account</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setEditSection('profile')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                                        <Info size={16} color="#374151" />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 }}>
                                    <Phone size={16} color="#6B7280" />
                                    <Text style={{ fontSize: 14, color: '#374151' }}>{phone || 'Not set'}</Text>
                                </View>
                            </View>

                            {/* ── Settings Links */}
                            <View style={[card, { padding: 0, overflow: 'hidden' }]}>
                                {[
                                    { id: 'subscription', icon: <Gift size={20} color="#D97706" />, bg: '#FEF3C7', label: 'Subscription', desc: 'Manage your plan' },
                                    {
                                        id: 'locations',
                                        icon: <MapPin size={20} color="#059669" />,
                                        bg: '#ECFDF5',
                                        label: 'Manage Locations',
                                        desc: 'Add or manage store branches',
                                        hide: !(
                                            subDetails?.status === 'active' &&
                                            (subDetails?.plan_tier === 'pro' || subDetails?.plan_tier === 'growth' ||
                                                subDetails?.razorpay_plan_id === 'plan_SGPdx1HD4uPPQn' || subDetails?.razorpay_plan_id === 'plan_SGPdRGGKwsGCpN')
                                        )
                                    },
                                    { id: 'notifications', icon: <Info size={20} color={P} />, bg: P10, label: 'Notifications', desc: 'Manage alerts & updates' },
                                    { id: 'privacy', icon: <Info size={20} color="#16A34A" />, bg: '#F0FDF4', label: 'Privacy & Security', desc: 'Control your data' },
                                    { id: 'support', icon: <Info size={20} color="#3B82F6" />, bg: '#EFF6FF', label: 'Help & Support', desc: 'Get help or contact us' },
                                ].filter(i => !i.hide).map((item, i, arr) => (
                                    <TouchableOpacity key={item.id} onPress={() => setSettingsSection(item.id as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>{item.icon}</View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.label}</Text>
                                            <Text style={{ fontSize: 12, color: '#6B7280' }}>{item.desc}</Text>
                                        </View>
                                        <ChevronRight size={18} color="#9CA3AF" />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* ── Legal */}
                            <View style={[card, { padding: 0, overflow: 'hidden' }]}>
                                <TouchableOpacity onPress={() => Linking.openURL('https://druto.me/legal?section=privacy')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' }}>Privacy Policy</Text>
                                    <ChevronRight size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => Linking.openURL('https://druto.me/legal?section=terms')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' }}>Terms of Service</Text>
                                    <ChevronRight size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => Linking.openURL('https://druto.me/legal?section=refund')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
                                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' }}>Refund Policy</Text>
                                    <ChevronRight size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            {/* ── Sign Out */}
                            <TouchableOpacity onPress={onSignOut} style={[card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
                                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                                    <LogOut size={18} color="#EF4444" />
                                </View>
                                <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#EF4444' }}>Sign Out</Text>
                                <ChevronRight size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}



// Shared card style
const card = {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
} as const;

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function OwnerDashboard() {
    const router = useRouter();
    const { restaurant, stats, rewards, customers, pendingScans, claimedRewards, branches, isLoading, refetch } = useOwnerData() as any;
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [showProfile, setShowProfile] = useState(false);
    const [profileInitialSection, setProfileInitialSection] = useState<'subscription' | 'business' | null>(null);

    // Subscription state at dashboard level
    const [subDetails, setSubDetails] = useState<any>(null);
    const [loadingSub, setLoadingSub] = useState(false);

    useEffect(() => {
        const fetchSubStatus = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data } = await supabase
                    .from('subscriptions')
                    .select('status, current_period_end, plan_tier, razorpay_plan_id')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (data) setSubDetails(data);
            } catch (e) { }
        };
        if (restaurant) fetchSubStatus();
    }, [restaurant]);

    const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/(auth)/login' as any); } },
        ]);
    };

    if (isLoading && !restaurant) {
        return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}><ActivityIndicator size="large" color={P} /></View>;
    }

    if (!restaurant && !isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <View style={{ backgroundColor: P, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: 'white' }}>Business Dashboard</Text>
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Set up your restaurant to get started</Text>
                </View>
                <View style={{ padding: 16, marginTop: -24 }}>
                    <View style={[card, { alignItems: 'center', padding: 32 }]}>
                        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: P10, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <Store size={32} color={P} />
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Set Up Your Restaurant</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>Create your restaurant profile to start</Text>
                        <TouchableOpacity style={{ height: 48, borderRadius: 14, backgroundColor: P, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                            <Plus size={20} color="white" />
                            <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Create Restaurant</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    const tabs: { key: TabType; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'customers', label: 'Customers' },
        { key: 'rewards', label: 'Rewards' },
        { key: 'settings', label: 'Settings' },
    ];

    const pendingRewardsCount = (claimedRewards || []).filter((r: any) => !r.isRedeemed && !r.isExpired).length;

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            {/* Profile Modal */}
            <ProfileModal
                visible={showProfile}
                onClose={() => { setShowProfile(false); setProfileInitialSection(null); }}
                restaurant={restaurant}
                subDetails={subDetails}
                loadingSub={loadingSub}
                setSubDetails={setSubDetails}
                branches={branches}
                initialSection={profileInitialSection}
                onSignOut={() => { setShowProfile(false); setTimeout(handleSignOut, 300); }}
                refetch={refetch}
            />

            {/* Scrollable content */}
            <ScrollView
                style={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={P} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* ── HEADER ── */}
                <View style={{ backgroundColor: P, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 32 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                            {restaurant?.logoUrl
                                ? <Image source={{ uri: restaurant.logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                : <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>{(restaurant?.name || 'R').charAt(0).toUpperCase()}</Text>
                            }
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: 'white' }}>{restaurant?.name}</Text>
                                <View style={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 100,
                                    backgroundColor: subDetails?.status === 'active' ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.2)',
                                    borderWidth: 1,
                                    borderColor: subDetails?.status === 'active' ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.3)'
                                }}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: subDetails?.status === 'active' ? '#BBF7D0' : 'rgba(255,255,255,0.8)' }}>
                                        {subDetails?.status === 'active'
                                            ? ((subDetails.plan_tier === 'pro' || subDetails.razorpay_plan_id === 'plan_SGPdx1HD4uPPQn') ? 'Pro' :
                                                (subDetails.plan_tier === 'growth' || subDetails.razorpay_plan_id === 'plan_SGPdRGGKwsGCpN') ? 'Growth' :
                                                    'Starter')
                                            : 'Free Trial'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Business Dashboard</Text>
                        </View>
                        {/* Profile button — opens profile modal, NOT logout */}
                        <TouchableOpacity onPress={() => setShowProfile(true)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* 4-col stats grid */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                            { Icon: TrendingUp, value: stats?.totalScans ?? 0, label: 'Scans' },
                            { Icon: Users, value: stats?.uniqueCustomers ?? 0, label: 'Users' },
                            { Icon: Gift, value: stats?.rewardsRedeemed ?? 0, label: 'Rewards' },
                            { Icon: Trophy, value: `${stats?.repeatRate ?? 0}%`, label: 'Repeat' },
                        ].map(({ Icon, value, label }) => (
                            <View key={label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                                <Icon size={14} color="rgba(255,255,255,0.8)" style={{ marginBottom: 4 }} />
                                <Text style={{ fontSize: 18, fontWeight: '700', color: 'white' }}>{value}</Text>
                                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── TAB CONTENT ── */}
                <View style={{ padding: 16, paddingTop: 20 }}>
                    {activeTab === 'overview' && (
                        <OverviewTab
                            restaurant={restaurant}
                            rewards={rewards}
                            stats={stats}
                            pendingScans={pendingScans}
                            refetch={refetch}
                            subDetails={subDetails}
                            onUpgrade={() => { setProfileInitialSection('subscription'); setShowProfile(true); }}
                        />
                    )}
                    {activeTab === 'customers' && <CustomersTab customers={customers} />}
                    {activeTab === 'rewards' && <RewardsTab claimedRewards={claimedRewards} refetch={refetch} />}
                    {activeTab === 'settings' && (
                        <SettingsTab
                            restaurant={restaurant}
                            rewards={rewards}
                            refetch={refetch}
                            subDetails={subDetails}
                            onUpgrade={() => { setProfileInitialSection('subscription'); setShowProfile(true); }}
                        />
                    )}
                </View>
            </ScrollView>

            {/* ── BOTTOM TAB BAR — sticky at bottom ── */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: 'white',
                borderTopWidth: 1, borderTopColor: '#F3F4F6',
                flexDirection: 'row',
                paddingBottom: 32, paddingTop: 8, paddingHorizontal: 8,
                shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
            }}>
                {tabs.map(tab => {
                    const active = activeTab === tab.key;
                    const hasBadge = tab.key === 'rewards' && pendingRewardsCount > 0 && !active;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 12, backgroundColor: active ? P + '15' : 'transparent' }}
                            activeOpacity={0.7}
                        >
                            {hasBadge && (
                                <View style={{ position: 'absolute', top: 4, right: '20%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', zIndex: 1 }} />
                            )}
                            {tab.key === 'overview' && <TrendingUp size={22} color={active ? P : '#9CA3AF'} />}
                            {tab.key === 'customers' && <Users size={22} color={active ? P : '#9CA3AF'} />}
                            {tab.key === 'rewards' && <Gift size={22} color={active ? P : '#9CA3AF'} />}
                            {tab.key === 'settings' && <Store size={22} color={active ? P : '#9CA3AF'} />}
                            <Text style={{ fontSize: 11, marginTop: 4, fontWeight: active ? '700' : '500', color: active ? P : '#9CA3AF' }}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}
