import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'fullScreenModal',
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_bottom',
      }}
    />
  );
}
