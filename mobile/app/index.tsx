import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function Index() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            console.log("Checking session...");
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log("Session result:", !!session, "Error:", error?.message);

                if (!session) {
                    // One more check — did our manual expiry timestamp expire?
                    const expiry = await SecureStore.getItemAsync('druto_session_expiry');
                    const now = Date.now();

                    if (expiry && now < parseInt(expiry)) {
                        // Session should be valid, but Supabase might have lost it.
                        // Refreshing usually helps if the tokens are still in storage.
                        const { data: refreshed } = await supabase.auth.refreshSession();
                        if (!refreshed.session) {
                            router.replace('/(auth)/login' as any);
                            return;
                        }
                    } else {
                        router.replace('/(auth)/login' as any);
                        return;
                    }
                }

                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (!currentSession) {
                    router.replace('/(auth)/login' as any);
                    return;
                }
                const userId = currentSession.user.id;

                // Check user_roles table first (most authoritative — set by edge function)
                const { data: roleRow } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', userId)
                    .maybeSingle();

                const role = roleRow?.role;
                console.log("User role from user_roles:", role);

                if (role === 'restaurant_owner') {
                    console.log("Redirecting to owner dashboard");
                    router.replace('/owner/dashboard' as any);
                } else {
                    // Fallback: check profiles.user_type
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('user_type')
                        .eq('id', userId)
                        .single();

                    console.log("Profile user_type:", profile?.user_type);

                    if (profile?.user_type === 'owner') {
                        console.log("Redirecting to owner dashboard (via profile)");
                        router.replace('/owner/dashboard' as any);
                    } else {
                        console.log("Redirecting to customer tabs");
                        router.replace('/(tabs)' as any);
                    }
                }
            } catch (e: any) {
                console.error("CheckSession catch:", e.message);
                router.replace('/(auth)/login' as any);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#900A12" />
            <Text style={{ marginTop: 20, color: '#4B5563', fontWeight: 'bold' }}>Initializing Druto...</Text>
        </View>
    );
}
