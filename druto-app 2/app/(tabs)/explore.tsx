import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MapPin, Utensils, Coffee, Scissors, Dumbbell, Navigation } from 'lucide-react-native';
import { useExploreData } from '../../hooks/useExploreData';
import * as Location from 'expo-location';

const PRIMARY = '#900A12';

const categories = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'restaurant', label: 'Food', icon: Utensils },
    { id: 'cafe', label: 'Coffee', icon: Coffee },
    { id: 'salon', label: 'Salon', icon: Scissors },
    { id: 'gym', label: 'Gym', icon: Dumbbell },
];

export default function ExploreScreen() {
    const router = useRouter();
    const { restaurants, isLoading, refetch } = useExploreData();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [currentCity, setCurrentCity] = useState<string | null>(null);

    const handleGetLocation = useCallback(async () => {
        setLocationLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationLoading(false);
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            let reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (reverse.length > 0) {
                const city = reverse[0].city || reverse[0].name || 'My Location';
                setCurrentCity(city);
                setSearch(city);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLocationLoading(false);
        }
    }, []);

    const handleRefresh = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const filteredRestaurants = React.useMemo(() => {
        return (restaurants as any[]).filter((r) => {
            const matchesSearch =
                r.name.toLowerCase().includes(search.toLowerCase()) ||
                (r.address && r.address.toLowerCase().includes(search.toLowerCase()));
            const matchesCategory = !activeCategory || activeCategory === 'all' || r.category?.toLowerCase() === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [restaurants, search, activeCategory]);

    const renderHeader = () => (
        <>
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
                <Text style={{ fontSize: 28, fontWeight: '700', color: 'white', marginBottom: 4 }}>Explore</Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Find new favorites near you</Text>
            </View>

            {/* Location Button & Search - overlapping header */}
            <View style={{ paddingHorizontal: 16, marginTop: -24 }}>
                <TouchableOpacity
                    onPress={handleGetLocation}
                    disabled={locationLoading}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 12,
                        borderRadius: 50,
                        backgroundColor: 'white',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 4,
                        borderWidth: 1,
                        borderColor: '#F3F4F6',
                        marginBottom: 10,
                    }}
                >
                    {locationLoading ? (
                        <ActivityIndicator size="small" color={PRIMARY} />
                    ) : (
                        <Navigation size={16} color={PRIMARY} />
                    )}
                    <Text style={{ color: PRIMARY, fontWeight: '600', fontSize: 13 }}>
                        {currentCity || 'Use my current location'}
                    </Text>
                </TouchableOpacity>

                {/* Search */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: 50,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        elevation: 4,
                        borderWidth: 1,
                        borderColor: '#F3F4F6',
                    }}
                >
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        placeholder="Find businesses near you"
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#9CA3AF"
                        style={{
                            flex: 1,
                            marginLeft: 10,
                            fontSize: 15,
                            color: '#111827',
                        }}
                    />
                </View>
            </View>

            {/* Categories */}
            <View style={{ paddingTop: 20, paddingLeft: 16 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                    {categories.map((cat) => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setActiveCategory(isActive ? null : cat.id)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 50,
                                    marginRight: 8,
                                    backgroundColor: isActive ? PRIMARY : 'white',
                                    borderWidth: 1,
                                    borderColor: isActive ? PRIMARY : '#E5E7EB',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.06,
                                    shadowRadius: 4,
                                    elevation: isActive ? 3 : 1,
                                }}
                            >
                                <cat.icon size={14} color={isActive ? 'white' : '#374151'} />
                                <Text
                                    style={{ fontSize: 13, fontWeight: '500', color: isActive ? 'white' : '#374151' }}
                                >
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    <View style={{ width: 16 }} />
                </ScrollView>
            </View>

            {/* Section Header */}
            <View
                style={{ paddingHorizontal: 16, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}
            >
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Trending Near You</Text>
                <TouchableOpacity>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY }}>View all</Text>
                </TouchableOpacity>
            </View>
            {isLoading && (
                <View style={{ paddingVertical: 40 }}>
                    <ActivityIndicator size="small" color={PRIMARY} />
                </View>
            )}
        </>
    );

    const renderEmpty = () => {
        if (isLoading) return null;
        return (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
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
                    <Text style={{ fontSize: 28 }}>🔍</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                    {restaurants.length === 0 ? 'No restaurants yet' : 'No results found'}
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                    {restaurants.length === 0 ? 'Be the first to join druto!' : 'Try a different search term'}
                </Text>
            </View>
        );
    };

    return (
        <FlatList
            style={{ flex: 1, backgroundColor: '#F9FAFB' }}
            refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={PRIMARY} />}
            data={filteredRestaurants}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item: restaurant }: { item: any }) => (
                <View style={{ paddingHorizontal: 16 }}>
                    <TouchableOpacity
                        onPress={() => {
                            const initialData = encodeURIComponent(JSON.stringify({
                                id: restaurant.id,
                                name: restaurant.name,
                                logoUrl: restaurant.logoUrl,
                                coverUrl: restaurant.coverUrl,
                                category: restaurant.category,
                                description: restaurant.description,
                                address: restaurant.address,
                                latitude: restaurant.latitude,
                                longitude: restaurant.longitude,
                            }));
                            router.push(`/restaurant/${restaurant.slug || restaurant.id}?initialData=${initialData}` as any);
                        }}
                        activeOpacity={0.8}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: 'white',
                            borderRadius: 16,
                            padding: 14,
                            marginBottom: 10,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.06,
                            shadowRadius: 6,
                            elevation: 2,
                            borderWidth: 1,
                            borderColor: '#F3F4F6',
                        }}
                    >
                        {/* Logo */}
                        <View
                            style={{
                                height: 44,
                                width: 44,
                                borderRadius: 22,
                                backgroundColor: `${PRIMARY}15`,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}
                        >
                            {restaurant.logoUrl ? (
                                <Image source={{ uri: restaurant.logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                                <Text style={{ fontSize: 20 }}>{restaurant.icon || '🏪'}</Text>
                            )}
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                                {restaurant.name}
                            </Text>
                            <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: '500', marginTop: 2 }} numberOfLines={1}>
                                Win: {restaurant.reward?.split(' after')[0] || 'Free Reward'}
                            </Text>
                            {restaurant.address && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                    <MapPin size={10} color="#9CA3AF" />
                                    <Text style={{ fontSize: 11, color: '#9CA3AF' }} numberOfLines={1}>
                                        {restaurant.address}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Status */}
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                color: restaurant.isActive ? '#16A34A' : '#9CA3AF',
                            }}
                        >
                            {restaurant.isActive ? 'OPEN' : 'CLOSED'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        />
    );
}
