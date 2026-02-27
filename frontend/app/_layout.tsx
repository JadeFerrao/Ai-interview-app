import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: "#8800ffff" }}>
      <Stack.Screen name="index" options={{ title: "Select Role" }} />
      <Stack.Screen name="chat" options={{ title: "Interview In Progress" }} />
      <Stack.Screen name="results" options={{ title: "Your Performance" }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}