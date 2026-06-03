import { Redirect, Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../../src/lib/theme';
import { useAuthStore } from '../../src/lib/authStore';

/**
 * SVG-style icon set — no emoji, no external icon packs needed.
 * All icons drawn as unicode geometric shapes that render consistently
 * across Android & iOS.
 */
const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  find:       { active: '\u29BF', inactive: '\u25EF' },  // filled / open circle with crosshair feel
  index:      { active: '\u25A0', inactive: '\u25A1' },  // filled / open square (home)
  referrals:  { active: '\u25C6', inactive: '\u25C7' },  // filled / open diamond
  facilities: { active: '\u2316', inactive: '\u2316' },  // position indicator (building)
  profile:    { active: '\u25D6', inactive: '\u25D7' },  // half-filled circle (person)
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icon = TAB_ICONS[name] ?? { active: '\u25CF', inactive: '\u25CB' };
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, { color: focused ? C.brand : C.g400 }]}>
        {focused ? icon.active : icon.inactive}
      </Text>
      {focused && <View style={styles.dot} />}
    </View>
  );
}

export default function TabsLayout() {
  const hydrated = useAuthStore(s => s.hydrated);
  const user = useAuthStore(s => s.user);

  if (!hydrated) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(public)/find" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   C.brand,
        tabBarInactiveTintColor: C.g400,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth:  0.5,
          borderTopColor:  C.g200,
          height:          60,
          paddingBottom:   8,
          paddingTop:      6,
          elevation:       8,
          shadowColor:     '#000',
          shadowOpacity:   0.06,
          shadowRadius:    6,
          shadowOffset:    { width: 0, height: -2 },
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="find"
        options={{
          title: 'Find',
          tabBarIcon: ({ focused }) => <TabIcon name="find" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="referrals"
        options={{
          title: 'Referrals',
          tabBarIcon: ({ focused }) => <TabIcon name="referrals" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="facilities"
        options={{
          title: 'Facilities',
          tabBarIcon: ({ focused }) => <TabIcon name="facilities" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 28 },
  icon:     { fontSize: 18, lineHeight: 22 },
  dot:      { width: 4, height: 4, borderRadius: 2, backgroundColor: C.brand, marginTop: 2 },
});
