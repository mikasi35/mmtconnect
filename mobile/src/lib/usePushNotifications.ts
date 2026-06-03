/**
 * usePushNotifications
 *
 * Call this once from _layout.tsx after login.
 * - Requests notification permission
 * - Gets the Expo push token
 * - Registers it with the backend
 * - Sets up notification channel (Android)
 * - Handles taps on notifications → navigate to the right screen
 */
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { mobileApi } from './api';

// How notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener     = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    registerForPush();

    // Fired when a notification arrives while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(_notification => {
      // Badge update handled automatically via shouldSetBadge above
    });

    // Fired when user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (!data) return;

      if (data.screen === 'facilities' && data.facilityId) {
        router.push('/(tabs)/facilities');
      } else if (data.screen === 'referrals') {
        router.push('/(tabs)/referrals');
      } else if (data.screen === 'find') {
        router.push('/(tabs)/find');
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

async function registerForPush() {
  if (!Device.isDevice) {
    // Push tokens only work on real devices; simulators get a fake token
    console.log('[push] Skipping — not a physical device');
    return;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('vacancies', {
      name:               'New Vacancies',
      importance:         Notifications.AndroidImportance.HIGH,
      vibrationPattern:   [0, 250, 250, 250],
      lightColor:         '#1A3A8F',
      description:        'Alerts when new NDIS accommodation becomes available',
    });
    await Notifications.setNotificationChannelAsync('referrals', {
      name:               'Referral Updates',
      importance:         Notifications.AndroidImportance.DEFAULT,
      description:        'Updates on placement referrals',
    });
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[push] Permission denied');
    return;
  }

  // Get token and register with backend
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    await mobileApi.auth.registerPushToken(tokenData.data);
    console.log('[push] Registered:', tokenData.data.slice(0, 32) + '…');
  } catch (err) {
    console.warn('[push] Token registration failed:', err);
  }
}
