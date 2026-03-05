import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    async function handleAuth() {
        if (!email || !password || (isSignUp && !name)) {
            Alert.alert('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        },
                    },
                });

                if (error) throw error;

                // Profiles are usually handled by a database trigger in Supabase,
                // but we can also manually upsert it here to be sure.
                if (data.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({ user_id: data.user.id, name: name });

                    if (profileError) console.error('Error creating profile:', profileError);
                }

                Alert.alert('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;
            }
        } catch (error: any) {
            Alert.alert(error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
            <Text style={styles.subtitle}>
                {isSignUp ? 'Sign up to start your interview journey' : 'Sign in to continue your progress'}
            </Text>

            {isSignUp && (
                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                />
            )}

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleAuth}
                disabled={loading}
            >
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                style={styles.switchButton}
            >
                <Text style={styles.switchText}>
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2d3748',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#718096',
        marginBottom: 30,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#f7fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 10,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonGradient: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    switchText: {
        color: '#764ba2',
        fontSize: 14,
        fontWeight: '600',
    },
});
