import { Stack } from 'expo-router';

export default function AuthLayout() {
    console.log("Rendering AuthLayout");
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
        </Stack>
    );
}
