import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
// @ts-ignore
import { NavigationContainer } from "@react-navigation/native";
// @ts-ignore
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, Text } from "react-native";
import { initializeDatabase, closeDatabase } from "./src/database/database";
import { initializeEmployees } from "./src/database/employees";
import ClockScreen from "./src/screens/ClockScreen";
import AdminScreen from "./src/screens/AdminScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setupApp() {
      try {
        await initializeDatabase();
        await initializeEmployees();
        setIsReady(true);
      } catch (err) {
        console.error("Failed to initialize app:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    setupApp();

    return () => {
      closeDatabase();
    };
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#C62828" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red", fontSize: 16 }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <>
      {/* @ts-ignore */}
      <StatusBar />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: "#C62828",
            tabBarInactiveTintColor: "#999",
            tabBarStyle: {
              borderTopColor: "#ddd",
              borderTopWidth: 1,
              paddingBottom: 8,
            },
            headerStyle: {
              backgroundColor: "#7C2D12",
            },
            headerTintColor: "white",
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        >
          <Tab.Screen
            name="Clock"
            component={ClockScreen}
            options={{
              tabBarLabel: "Clock In/Out",
              tabBarIcon: (props: any) => <TabBarIcon color={props.color} name="🕐" />,
              headerShown: false,
            }}
          />
          <Tab.Screen
            name="Admin"
            component={AdminScreen}
            options={{
              tabBarLabel: "Payroll",
              tabBarIcon: (props: any) => <TabBarIcon color={props.color} name="📊" />,
              headerShown: false,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const TabBarIcon = ({ color, name }: { color: string; name: string }) => (
  <Text style={{ color, fontSize: 20 }}>{name}</Text>
);