import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { getHistory } from '../services/api';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

interface InterviewHistory {
    id: string;
    job_title: string;
    created_at: string;
    completed: boolean;
}

export default function HistoryScreen() {
    const router = useRouter();
    const [history, setHistory] = useState<InterviewHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        else setRefreshing(true);

        try {
            const data = await getHistory("temp-user-id");
            setHistory(data);
        } catch (error) {
            console.error('Fetch history error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        fetchHistory(true);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderItem = ({ item }: { item: InterviewHistory }) => (
        <TouchableOpacity
            style={styles.historyItem}
            onPress={() => {
                if (item.completed) {
                    router.push({ pathname: '/results', params: { interviewId: item.id } });
                } else {
                    // If not completed, maybe we can resume? For now just show it.
                    // Or tell them it was incomplete.
                    router.push({ pathname: '/chat', params: { role: item.job_title, interviewId: item.id, completed: 'false' } });
                }
            }}
            activeOpacity={0.7}
        >
            <View style={styles.itemHeader}>
                <Text style={styles.jobTitle}>{item.job_title}</Text>
                <View style={[styles.statusBadge, item.completed ? styles.completedBadge : styles.incompleteBadge]}>
                    <Text style={styles.statusText}>{item.completed ? 'Completed' : 'Incomplete'}</Text>
                </View>
            </View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {loading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color="#667eea" />
                        <Text style={styles.loadingText}>Fetching your history...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={history}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={[styles.listContent, history.length === 0 && { flex: 1, justifyContent: 'center' }]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#667eea']}
                                tintColor="#667eea"
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.centerContent}>
                                <Text style={styles.noHistoryText}>No interviews taken yet</Text>
                                <TouchableOpacity
                                    style={styles.startNowButton}
                                    onPress={() => router.replace('/')}
                                >
                                    <Text style={styles.startNowButtonText}>Start your first one!</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f7fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 0 : 40,
        paddingBottom: 20,
        height: Platform.OS === 'ios' ? 60 : 100,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
    },
    listContent: {
        padding: 20,
    },
    historyItem: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    jobTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2d3748',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    completedBadge: {
        backgroundColor: '#c6f6d5',
    },
    incompleteBadge: {
        backgroundColor: '#feebc8',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2d3748',
    },
    dateText: {
        fontSize: 14,
        color: '#718096',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 15,
        color: '#718096',
        fontSize: 16,
    },
    noHistoryText: {
        fontSize: 18,
        color: '#718096',
        textAlign: 'center',
        marginBottom: 20,
    },
    startNowButton: {
        backgroundColor: '#667eea',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
    },
    startNowButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
