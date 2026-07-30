import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/hooks';
import LoginScreen from './src/screens/LoginScreen';
import AgendaScreen from './src/screens/AgendaScreen';
import NewAppointmentScreen from './src/screens/NewAppointmentScreen';
import AvailabilityScreen from './src/screens/AvailabilityScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Agenda: { focused: 'calendar', idle: 'calendar-outline' },
  NewAppointment: { focused: 'add-circle', idle: 'add-circle-outline' },
  Availability: { focused: 'time', idle: 'time-outline' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          height: 84,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] || {
            focused: 'ellipse',
            idle: 'ellipse-outline',
          };
          return (
            <Ionicons
              name={focused ? icons.focused : icons.idle}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{ tabBarLabel: 'Agenda' }}
      />
      <Tab.Screen
        name="NewAppointment"
        component={NewAppointmentScreen}
        options={{ tabBarLabel: 'Nuevo' }}
      />
      <Tab.Screen
        name="Availability"
        component={AvailabilityScreen}
        options={{ tabBarLabel: 'Horarios' }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { professional, booting } = useAuth();

  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {professional ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
