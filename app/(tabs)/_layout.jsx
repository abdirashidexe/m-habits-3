import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Easing, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFajrTheme } from '../../hooks/useFajrTheme';
// import { FaHouse, FaChartSimple, FaUser, FaRocket } from "react-icons/fa6";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

// Usage
{/* <FontAwesome6 name="chart-simple" size={24} color="black" />
<FontAwesome6 name="user" size={24} color="black" />
<FontAwesome6 name="rocket" size={24} color="black" /> */}

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const { colors, typography } = useFajrTheme();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: { duration: 120, easing: Easing.in(Easing.linear) },
        },
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          paddingTop: 6,
          paddingBottom: bottomPad,
          height: Platform.OS === 'ios' ? 52 + bottomPad : 60 + bottomPad,
        },
        tabBarLabelStyle: typography.caption,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <TabIcon color={color} label={<FontAwesome6 name="house" size={24} color={color} />}/>,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: t('tabs.habits'),
          tabBarIcon: ({ color }) => <TabIcon color={color} label={<FontAwesome6 name="rocket" size={24} color={color} />} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ color }) => <TabIcon color={color} label={<FontAwesome6 name="chart-simple" size={24} color={color} />} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <TabIcon color={color} label={<FontAwesome6 name="user-gear" size={24} color={color} />} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ color, label }) {
  return (
    <Text style={{ color, fontSize: 18, fontWeight: '600', marginBottom: -2 }}>{label}</Text>
  );
}
