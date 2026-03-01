import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, saveProfile } from './api';

const USER_ID_KEY = 'user_id';
const USER_NAME_KEY = 'user_name';

export async function getStoredUser() {
    try {
        let userId = await AsyncStorage.getItem(USER_ID_KEY);
        let userName = await AsyncStorage.getItem(USER_NAME_KEY);

        // If we have a local user but no name, or if we want to sync with server
        if (userId && !userName) {
            const profile = await getProfile(userId);
            if (profile && profile.name) {
                userName = profile.name;
                await AsyncStorage.setItem(USER_NAME_KEY, userName as string);
            }
        }

        return { userId, userName };
    } catch (error) {
        console.error('Error fetching user from storage:', error);
        return { userId: null, userName: null };
    }
}

export async function storeUser(name: string) {
    try {
        const userId = 'user-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
        await AsyncStorage.setItem(USER_ID_KEY, userId);
        await AsyncStorage.setItem(USER_NAME_KEY, name);

        // Sync with server (Supabase)
        await saveProfile(userId, name);

        return { userId, userName: name };
    } catch (error) {
        console.error('Error storing user in storage:', error);
        return null;
    }
}

export async function clearUser() {
    try {
        await AsyncStorage.removeItem(USER_ID_KEY);
        await AsyncStorage.removeItem(USER_NAME_KEY);
    } catch (error) {
        console.error('Error clearing user from storage:', error);
    }
}
