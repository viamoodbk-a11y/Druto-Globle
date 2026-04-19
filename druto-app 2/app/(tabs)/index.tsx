import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Dimensions,
  Linking,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Gift, Zap, MapPin, Sparkles } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useCustomerData } from '../../hooks/useCustomerData';
import { StampCard } from '../../components/StampCard';

const { width } = Dimensions.get('window');
const PRIMARY = '#900A12';

interface HeroBanner {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { loyaltyCards, totalVisits, rewardsEarned, isLoading, profile, refetch } = useCustomerData();

  const { data: bannerData, isLoading: isBannersLoading } = useQuery({
    queryKey: ['hero_banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_banners')
        .select('id, image_url, title, subtitle, link_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data as HeroBanner[];
    },
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  const banners = bannerData || [];
  const bannersLoading = isBannersLoading && banners.length === 0;

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const activeRewards = loyaltyCards.filter((r) => r.current < r.total);
  const userName = profile?.fullName || 'User';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING,';
    if (hour < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  const handleNavigateProfile = () => {
    router.push('/(tabs)/profile');
  };

  if (isLoading && loyaltyCards.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={{ marginTop: 16, color: '#6B7280', fontWeight: '500' }}>Loading your rewards...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <>
      {/* Curved Header - matching webapp gradient-primary */}
      <View
        style={{
          backgroundColor: PRIMARY,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          paddingHorizontal: 16,
          paddingTop: 60,
          paddingBottom: 24,
        }}
      >
        {/* Greeting Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Druto Logo */}
            <View
              style={{
                height: 40,
                width: 40,
                borderRadius: 12,
                backgroundColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Image
                source={require('../../assets/images/icon.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '500', letterSpacing: 1 }}>
                {getGreeting()}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>{userName}</Text>
              {profile?.phone && (
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>{profile.phone}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={handleNavigateProfile}
            style={{
              height: 32,
              width: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={14} color="white" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards Row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              paddingVertical: 8,
              paddingHorizontal: 4,
              alignItems: 'center',
            }}
          >
            <Gift size={14} color="rgba(255,255,255,0.9)" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'white', marginTop: 2, lineHeight: 18 }}>
              {rewardsEarned}
            </Text>
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '500' }}>
              Rewards
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              paddingVertical: 8,
              paddingHorizontal: 4,
              alignItems: 'center',
            }}
          >
            <Zap size={14} color="rgba(255,255,255,0.9)" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'white', marginTop: 2, lineHeight: 18 }}>
              {activeRewards.length}
            </Text>
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '500' }}>
              Active
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              paddingVertical: 8,
              paddingHorizontal: 4,
              alignItems: 'center',
            }}
          >
            <MapPin size={14} color="rgba(255,255,255,0.9)" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'white', marginTop: 2, lineHeight: 18 }}>
              {totalVisits}
            </Text>
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '500' }}>
              Visits
            </Text>
          </View>
        </View>
      </View>

      {/* Hero Banners Carousel */}
      {bannersLoading ? (
        <View style={{ marginTop: -12, paddingHorizontal: 16, zIndex: 10 }}>
          <View style={{ width: '100%', aspectRatio: 2.2, backgroundColor: '#E5E7EB', borderRadius: 8 }} />
        </View>
      ) : banners.length > 0 ? (
        <View style={{ marginTop: -12, zIndex: 10 }}>
          <FlatList
            horizontal
            data={banners}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={banners.length > 1 ? width * 0.78 + 10 : width - 32}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            renderItem={({ item: banner }: { item: any }) => (
              <TouchableOpacity
                style={{
                  width: banners.length > 1 ? width * 0.78 : width - 32,
                  aspectRatio: 2.2,
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: '#E5E7EB',
                }}
                activeOpacity={banner.link_url ? 0.8 : 1}
                onPress={() => {
                  if (banner.link_url) {
                    Linking.openURL(banner.link_url);
                  }
                }}
              >
                <Image
                  source={{ uri: banner.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                {(banner.title || banner.subtitle) && (
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: 10,
                      justifyContent: 'flex-end',
                    }}
                  >
                    {banner.title && (
                      <View style={{ alignSelf: 'flex-start', backgroundColor: PRIMARY, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 2 }}>
                        <Text style={{ color: 'white', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                          {banner.title}
                        </Text>
                      </View>
                    )}
                    {banner.subtitle && (
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
                        {banner.subtitle}
                      </Text>
                    )}
                  </LinearGradient>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {/* Section Header */}
      <View style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Your Stamp Cards</Text>
      </View>
    </>
  );

  const renderEmpty = () => (
    <View
      style={{
        paddingVertical: 48,
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        marginHorizontal: 16,
      }}
    >
      <View
        style={{
          height: 56,
          width: 56,
          borderRadius: 16,
          backgroundColor: '#FEF3C7',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 28 }}>☕</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
        No stamp cards yet
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32, marginBottom: 20 }}>
        Scan a QR code to start collecting!
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/scan')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: PRIMARY,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 12,
        }}
      >
        <Sparkles size={16} color="white" />
        <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>Scan QR Code</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      data={loyaltyCards}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={PRIMARY} />}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={{ paddingBottom: 120 }}
      renderItem={({ item: card }: { item: any }) => (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <StampCard
            current={card.current}
            total={card.total}
            restaurantName={card.restaurantName}
            rewardDescription={card.rewardDescription}
            restaurantLogoUrl={card.restaurantLogoUrl}
            fallbackIcon={card.rewardItem}
            onClick={() => {
              const initialData = encodeURIComponent(JSON.stringify({
                name: card.restaurantName,
                logoUrl: card.restaurantLogoUrl,
                icon: card.rewardItem,
                totalRequired: card.total,
                userVisits: card.current,
                reward: card.rewardDescription,
                rewardImageUrl: card.rewardImageUrl
              }));
              router.push(`/restaurant/${card.restaurantSlug || card.restaurantId}?initialData=${initialData}` as any);
            }}
          />
        </View>
      )}
    />
  );
}
