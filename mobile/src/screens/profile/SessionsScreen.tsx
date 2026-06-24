import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Smartphone, Monitor, Globe, LogOut, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AnimatedHeader } from '../../components/layout/AnimatedHeader';
import { colors, spacing, typography } from '../../theme';
import { GlassCard } from '../../components/cards/GlassCard';

export const SessionsScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Placeholder data until endpoint is connected
  const [sessions, setSessions] = useState([
    {
      id: '1',
      deviceModel: 'iPhone 14 Pro Max',
      os: 'iOS 17.2',
      ip: '192.168.1.1',
      location: 'New York, USA',
      lastActive: 'Active now',
      isCurrent: true,
      type: 'mobile',
    },
    {
      id: '2',
      deviceModel: 'MacBook Pro M2',
      os: 'macOS 14.1',
      ip: '192.168.1.5',
      location: 'New York, USA',
      lastActive: '2 hours ago',
      isCurrent: false,
      type: 'desktop',
    },
  ]);

  const handleRevoke = (id: string) => {
    setRevokingId(id);
    // Simulate API call
    setTimeout(() => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setRevokingId(null);
    }, 1000);
  };

  const getIcon = (type: string) => {
    if (type === 'mobile') return <Smartphone color={colors.accentMint} size={24} />;
    if (type === 'desktop') return <Monitor color={colors.accentMint} size={24} />;
    return <Globe color={colors.accentMint} size={24} />;
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.primaryText} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Active Sessions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          These devices are currently logged into your account. Revoke access if you don't recognize a device.
        </Text>

        {sessions.map((session) => (
          <GlassCard key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionRow}>
              <View style={styles.iconBox}>
                {getIcon(session.type)}
              </View>
              
              <View style={styles.infoCol}>
                <Text style={styles.deviceText}>
                  {session.deviceModel} {session.isCurrent && '(This Device)'}
                </Text>
                <Text style={styles.detailText}>{session.os} • {session.ip}</Text>
                <Text style={styles.detailText}>{session.location}</Text>
                <Text style={[styles.detailText, session.isCurrent && styles.activeText]}>
                  {session.lastActive}
                </Text>
              </View>

              {!session.isCurrent && (
                <TouchableOpacity 
                  style={styles.revokeBtn}
                  onPress={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                >
                  {revokingId === session.id ? (
                    <ActivityIndicator color={colors.error} size="small" />
                  ) : (
                    <LogOut color={colors.error} size={20} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    marginRight: spacing.lg,
  },
  title: {
    color: colors.primaryText,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  subtitle: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  sessionCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(159, 213, 178, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  infoCol: {
    flex: 1,
  },
  deviceText: {
    color: colors.primaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.semibold,
    marginBottom: 4,
  },
  detailText: {
    color: colors.secondaryText,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  activeText: {
    color: colors.success,
    fontFamily: typography.fontFamily.medium,
  },
  revokeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.errorBg,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
