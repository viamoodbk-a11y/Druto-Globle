import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
export interface PushNotificationState {
    expoPushToken?: Notifications.ExpoPushToken;
    devicePushToken?: Notifications.DevicePushToken;
    notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: true,
            shouldShowAlert: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    const [expoPushToken, setExpoPushToken] = useState<
        Notifications.ExpoPushToken | undefined
    >();
    const [devicePushToken, setDevicePushToken] = useState<
        Notifications.DevicePushToken | undefined
    >();
    const [notification, setNotification] = useState<
        Notifications.Notification | undefined
    >();

    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    async function registerForPushNotificationsAsync() {
        let expoToken: Notifications.ExpoPushToken | undefined;
        let deviceToken: Notifications.DevicePushToken | undefined;

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.warn('Failed to get push token for push notification');
                return { expoToken: undefined, deviceToken: undefined };
            }

            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;

            if (!projectId) {
                console.warn('Project ID not found in app.json for push notifications.');
            }

            try {
                // Fetch Expo Token
                expoToken = await Notifications.getExpoPushTokenAsync({
                    projectId,
                });

                // Fetch Native Device Token (for direct FCM/APNs)
                deviceToken = await Notifications.getDevicePushTokenAsync();
                console.log("Native Device Token:", deviceToken.data);
            } catch (e) {
                console.error("Error getting push tokens:", e);
            }
        } else {
            console.warn('Must be using a physical device for Push Notifications');
        }

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#900A12',
            });
        }

        return { expoToken, deviceToken };
    }

    useEffect(() => {
        let currentExpoToken: string | undefined;
        let currentDeviceToken: string | undefined;

        const syncToken = async (expoTokenData?: string, deviceTokenData?: string) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                console.log("Syncing push tokens to backend for user", session.user.id);
                try {
                    await fetch(`${SUPABASE_FUNCTIONS_URL}/update-push-token`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                            Authorization: `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            userId: session.user.id,
                            pushToken: expoTokenData,
                            deviceToken: deviceTokenData,
                            tokenType: Platform.OS === 'ios' ? 'apns' : 'fcm'
                        })
                    });
                } catch (e) {
                    console.error("Failed to sync tokens:", e);
                }
            }
        };

        registerForPushNotificationsAsync().then(({ expoToken, deviceToken }) => {
            setExpoPushToken(expoToken);
            setDevicePushToken(deviceToken);

            currentExpoToken = expoToken?.data;
            currentDeviceToken = deviceToken?.data;

            if (currentExpoToken || currentDeviceToken) {
                syncToken(currentExpoToken, currentDeviceToken);
            }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user?.id && (currentExpoToken || currentDeviceToken)) {
                    syncToken(currentExpoToken, currentDeviceToken);
                }
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                setNotification(notification);
            }
        );

        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            async (response) => {
                console.log('Notification Response:', response);
                const data = response.notification.request.content.data;
                if (data?.campaignId) {
                    console.log("Tracking open for campaign:", data.campaignId);
                    const { data: { session } } = await supabase.auth.getSession();
                    fetch(`${SUPABASE_FUNCTIONS_URL}/track-push-open`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8',
                            Authorization: session ? `Bearer ${session.access_token}` : ''
                        },
                        body: JSON.stringify({ campaignId: data.campaignId })
                    }).catch(err => {
                        console.error("Failed to track push open:", err);
                    });
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return {
        expoPushToken,
        devicePushToken,
        notification,
    };
};
