import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getEvaluation } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';

// Helper function to parse and format evaluation text
const parseEvaluation = (text: string) => {
    const sections: any[] = [];
    const lines = text.split('\n');
    let currentSection: any = null;
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        
        // Check for section headers
        if (trimmedLine.includes('**') || trimmedLine.match(/^\d+\./)) {
            // Extract score if present (e.g., "Technical Skills (1-10)" or "2/10")
            const scoreMatch = trimmedLine.match(/(\d+)\/(\d+)/);
            const ratingMatch = trimmedLine.match(/\((\d+)\/10\)/);
            
            if (currentSection) {
                sections.push(currentSection);
            }
            
            currentSection = {
                type: 'section',
                title: trimmedLine.replace(/\*\*/g, '').replace(/^\d+\.\s*/, ''),
                content: [],
                score: scoreMatch ? parseInt(scoreMatch[1]) : (ratingMatch ? parseInt(ratingMatch[1]) : null),
                maxScore: scoreMatch ? parseInt(scoreMatch[2]) : 10,
            };
        } else if (currentSection) {
            currentSection.content.push(trimmedLine);
        } else {
            // Text before any section
            sections.push({ type: 'text', content: trimmedLine });
        }
    });
    
    if (currentSection) {
        sections.push(currentSection);
    }
    
    return sections;
};

// Score badge component
const ScoreBadge = ({ score, maxScore }: { score: number; maxScore: number }) => {
    const percentage = (score / maxScore) * 100;
    let bgColor = '#ef4444'; // red
    let textColor = '#fff';
    
    if (percentage >= 80) {
        bgColor = '#10b981'; // green
    } else if (percentage >= 60) {
        bgColor = '#f59e0b'; // orange
    } else if (percentage >= 40) {
        bgColor = '#f97316'; // orange-red
    }
    
    return (
        <View style={[styles.scoreBadge, { backgroundColor: bgColor }]}>
            <Text style={[styles.scoreText, { color: textColor }]}>{score}/{maxScore}</Text>
        </View>
    );
};

export default function ResultsScreen() {
    const { interviewId } = useLocalSearchParams();
    const [evaluation, setEvaluation] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadEvaluation();
    }, []);

    const loadEvaluation = async (isRefresh = false) => {
        if (!interviewId) {
            setEvaluation('No interview ID provided. Please complete an interview first.');
            setJobTitle('Interview Practice');
            setLoading(false);
            setRefreshing(false);
            fadeAnim.setValue(1);
            return;
        }

        try {
            const data = await getEvaluation(interviewId);
            setEvaluation(data.evaluation || 'Evaluation data not available. Pull down to refresh.');
            setJobTitle(data.jobTitle || 'Developer Position');
        } catch (error) {
            console.error('Error loading evaluation:', error);
            setEvaluation('Unable to load evaluation at this time. Pull down to refresh and try again.');
            setJobTitle('Interview Practice');
        } finally {
            setLoading(false);
            setRefreshing(false);
            
            // Fade in animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        // Reset fade animation
        fadeAnim.setValue(0);
        await loadEvaluation(true);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingCard}>
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={styles.loadingText}>Analyzing your performance...</Text>
                    <Text style={styles.loadingSubtext}>This won't take long</Text>
                </View>
            </View>
        );
    }

    const parsedSections = parseEvaluation(evaluation);

    return (
        <View style={styles.scrollContainer}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#667eea"
                        colors={['#667eea']}
                        title="Loading evaluation..."
                    />
                }
            >
                <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                    <View style={styles.pdfDocument}>
                        <View style={styles.pdfHeader}>
                            <Text style={styles.pdfTitle}>Interview Evaluation Report</Text>
                            <View style={styles.pdfMetadata}>
                                <Text style={styles.pdfMetaLabel}>Position:</Text>
                                <Text style={styles.pdfMetaValue}>{jobTitle}</Text>
                            </View>
                            <View style={styles.pdfMetadata}>
                                <Text style={styles.pdfMetaLabel}>Date:</Text>
                                <Text style={styles.pdfMetaValue}>{new Date().toLocaleDateString()}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.pdfDivider} />
                        
                        {parsedSections.map((section, index) => {
                            if (section.type === 'text') {
                                return (
                                    <Text key={index} style={styles.pdfPlainText}>
                                        {section.content}
                                    </Text>
                                );
                            }
                            
                            return (
                                <View key={index} style={styles.pdfSection}>
                                    <View style={styles.pdfSectionHeader}>
                                        <Text style={styles.pdfSectionTitle}>
                                            {section.title}
                                        </Text>
                                        {section.score !== null && (
                                            <ScoreBadge score={section.score} maxScore={section.maxScore} />
                                        )}
                                    </View>
                                    {section.content.length > 0 && (
                                        <View style={styles.pdfSectionContent}>
                                            {section.content.map((line: string, lineIndex: number) => (
                                                <Text key={lineIndex} style={styles.pdfSectionText}>
                                                    {line.startsWith('-') || line.startsWith('•') 
                                                        ? `  ${line}` 
                                                        : line}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                        
                        <View style={styles.pdfFooter}>
                            <Text style={styles.pdfFooterText}>
                                {evaluation.includes('Pull down') ? 'Pull down to refresh' : 'End of Report'}
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { 
        flex: 1,
        backgroundColor: '#e5e7eb',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        paddingTop: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f9fafb',
    },
    loadingCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 18,
        color: '#1f2937',
        fontWeight: '600',
    },
    loadingSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#6b7280',
    },
    container: { 
        flex: 1,
        alignItems: 'center',
    },
    pdfDocument: {
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: 800,
        padding: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    pdfHeader: {
        marginBottom: 24,
    },
    pdfTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    pdfMetadata: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    pdfMetaLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        width: 80,
    },
    pdfMetaValue: {
        fontSize: 14,
        color: '#1f2937',
        flex: 1,
    },
    pdfDivider: {
        height: 1,
        backgroundColor: '#d1d5db',
        marginBottom: 24,
    },
    pdfPlainText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#374151',
        marginBottom: 16,
    },
    pdfSection: {
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    pdfSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    pdfSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
        letterSpacing: -0.3,
    },
    scoreBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
        minWidth: 60,
        alignItems: 'center',
    },
    scoreText: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    pdfSectionContent: {
        marginTop: 8,
    },
    pdfSectionText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#4b5563',
        marginBottom: 6,
    },
    pdfFooter: {
        marginTop: 32,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#d1d5db',
        alignItems: 'center',
    },
    pdfFooterText: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: '500',
    },
});
