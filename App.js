import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from './src/db/database';
import { Settings } from './src/db/queries';
import { isAppLocked } from './src/security/auth';
import { useAppStore } from './src/stores';
import { getTheme } from './src/theme';
import LockScreen from './src/screens/Lock/LockScreen';
import OnboardingScreen from './src/screens/Onboarding/OnboardingScreen';
import TodayScreen from './src/screens/Today/TodayScreen';
import CalendarScreen from './src/screens/Calendar/CalendarScreen';
import InsightsScreen from './src/screens/Insights/InsightsScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';

const TabIcon = ({ label, focused }) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.35 }}>{label}</Text>
);
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ theme }) {
  const C = theme.colors;
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: C.bgCard, borderTopColor: C.border, borderTopWidth: 1, paddingBottom: 8, paddingTop: 6, height: 62, elevation: 6, shadowColor: C.isDark ? '#000' : '#C4A882', shadowOpacity: 0.15, shadowRadius: 8 },
      tabBarActiveTintColor: C.primary,
      tabBarInactiveTintColor: C.textMuted,
      tabBarLabelStyle: { fontSize: 11, marginTop: 2, fontWeight: '500' },
    }}>
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="🌿" focused={focused} /> }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="🌸" focused={focused} /> }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="✦" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="⚙" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { isLocked, isLoading, onboardingDone, darkMode, setLocked, setLoading, setDbReady, setSettings, loadDarkMode } = useAppStore();
  const theme = getTheme(darkMode);
  const C = theme.colors;

  useEffect(() => {
    async function boot() {
      try {
        await loadDarkMode();
        await initDatabase();
        setDbReady(true);
        const settings = await Settings.get();
        setSettings(settings);
        const locked = await isAppLocked();
        setLocked(locked);
      } catch (err) { console.error('Boot error:', err); }
      finally { setLoading(false); }
    }
    boot();
  }, []);

  const navTheme = {
    dark: darkMode,
    colors: { primary: C.primary, background: C.bg, card: C.bgCard, text: C.textPrimary, border: C.border, notification: C.accent },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '900' },
    },
  };

  if (isLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
        <Text style={{ color: C.primary, fontSize: 32 }}>●</Text>
        <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 8, letterSpacing: 4 }}>REDACTED</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isLocked ? <Stack.Screen name="Lock" component={LockScreen} />
              : !onboardingDone ? <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              : <Stack.Screen name="Main">{() => <MainTabs theme={theme} />}</Stack.Screen>}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ splash: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
