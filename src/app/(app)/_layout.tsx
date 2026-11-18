// app/(app)/_layout.tsx
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: true, title: "Social Media Automation" }}
      />
      <Stack.Screen
        name="users"
        options={{ headerShown: true, title: "Users" }}
      />
      <Stack.Screen
        name="articles"
        options={{ headerShown: true, title: "Articles" }}
      />
      <Stack.Screen
        name="sources"
        options={{ headerShown: true, title: "Sources" }}
      />
    </Stack>
  );
}
