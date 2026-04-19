import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Home, Compass, Gift, User, QrCode } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const PRIMARY = '#900A12';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const leftTabs = state.routes.slice(0, 2);
  const rightTabs = state.routes.slice(2, 4);

  const isActive = (index: number) => state.index === index;

  const getIcon = (routeName: string, active: boolean) => {
    const color = active ? PRIMARY : '#374151';
    const fill = active ? PRIMARY : 'none';
    switch (routeName) {
      case 'index': return <Home size={22} color={color} fill={fill} strokeWidth={active ? 0 : 1.5} />;
      case 'explore': return <Compass size={22} color={color} fill={fill} strokeWidth={active ? 0 : 1.5} />;
      case 'rewards': return <Gift size={22} color={color} fill={fill} strokeWidth={active ? 0 : 1.5} />;
      case 'profile': return <User size={22} color={color} fill={fill} strokeWidth={active ? 0 : 1.5} />;
      default: return <Home size={22} color={color} />;
    }
  };

  const getLabel = (routeName: string) => {
    switch (routeName) {
      case 'index': return 'Home';
      case 'explore': return 'Explore';
      case 'rewards': return 'Reward';
      case 'profile': return 'Profile';
      default: return routeName;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + 4 },
      ]}
    >
      <View style={styles.navRow}>
        {/* Left Group - Home & Explore */}
        <View style={styles.pill}>
          {leftTabs.map((route: any, idx: number) => {
            const active = isActive(idx);
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.navItem}
                onPress={() => navigation.navigate(route.name)}
                activeOpacity={0.7}
              >
                {getIcon(route.name, active)}
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {getLabel(route.name)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center - QR Scan Button */}
        <TouchableOpacity
          style={styles.scanButtonOuter}
          onPress={() => router.push('/scan')}
          activeOpacity={0.8}
        >
          <View style={styles.scanButtonInner}>
            {/* Custom QR Icon */}
            <QrCode size={26} color="white" strokeWidth={1.8} />
          </View>
        </TouchableOpacity>

        {/* Right Group - Reward & Profile */}
        <View style={styles.pill}>
          {rightTabs.map((route: any, idx: number) => {
            const realIdx = idx + 2;
            const active = isActive(realIdx);
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.navItem}
                onPress={() => navigation.navigate(route.name)}
                activeOpacity={0.7}
              >
                {getIcon(route.name, active)}
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {getLabel(route.name)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    paddingVertical: 6,
    gap: 2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
    marginTop: 1,
  },
  navLabelActive: {
    color: PRIMARY,
  },
  scanButtonOuter: {
    height: 68,
    width: 68,
    borderRadius: 34,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    // Lift it up above the nav bar
    marginTop: -20,
  },
  scanButtonInner: {
    height: 58,
    width: 58,
    borderRadius: 29,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default function TabLayout() {
  const router = useRouter();

  // Role guard: owners should never be in customer tabs
  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/(auth)/login' as any);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        if (profile?.user_type === 'owner') {
          router.replace('/owner/dashboard' as any);
        }
      } catch (e) { }
    };
    checkRole();
  }, []);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="rewards" options={{ title: 'Reward' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="restaurant/[slug]" options={{
        title: 'Restaurant Details',
        href: null // hides it from any auto-generated tab bar 
      }} />
    </Tabs>
  );
}
