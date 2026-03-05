import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerTintColor: "#8800ff" }}>
        <Stack.Screen name="index" options={{ title: "Select Role" }} />
        <Stack.Screen name="chat" options={{ title: "Interview In Progress" }} />
        <Stack.Screen name="results" options={{ title: "Your Performance" }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
  );
}