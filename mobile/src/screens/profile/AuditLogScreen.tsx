import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Shield, Key, LogIn, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { colors, spacing, typography } from '../../theme';
import { GlassCard } from '../../components/cards/GlassCard';

export const AuditLogScreen = () => {
  const navigation = useNavigation();

  // Placeholder data
  const [logs] = useState([
    {
      id: '1',
      action: 'Successful Login',
      details: 'Logged in from New York, USA via iOS App',
      date: 'Today, 10:45 AM',
      type: 'login_success',
      ip: '192.168.1.1'
    },
    {
      id: '2',
      action: 'Password Changed',
      details: 'Account password was successfully updated',
      date: 'Yesterday, 2:30 PM',
      type: 'security_update',
      ip: '192.168.1.1'
    },
    {
      id: '3',
      action: 'Failed Login Attempt',
      details: 'Incorrect password attempt from unknown device',
      date: 'Oct 15, 2023, 09:12 AM',
      type: 'login_failed',
      ip: '10.0.0.55'
    },
    {
      id: '4',
      action: 'New Device Authorized',
      details: 'MacBook Pro M2 authorized for access',
      date: 'Oct 14, 2023, 11:20 AM',
      type: 'device_auth',
      ip: '192.168.1.5'
    }
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'login_success':
        return <LogIn color={colors.success} size={20} />;
      case 'login_failed':
        return <Shield color={colors.error} size={20} />;
      case 'security_update':
        return <Key color={colors.accentYellow} size={20} />;
      case 'device_auth':
        return <Shield color={colors.info} size={20} />;
      default:
        return <Shield color={colors.accentMint} size={20} />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'login_success':
        return colors.successBg;
      case 'login_failed':
        return colors.errorBg;
      case 'security_update':
        return 'rgba(246, 237, 74, 0.1)';
      case 'device_auth':
        return 'rgba(56, 189, 248, 0.1)';
      default:
        return 'rgba(159, 213, 178, 0.1)';
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.primaryText} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Audit Log</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Review recent security events and account activity. Contact support if you notice anything suspicious.
        </Text>

        <View style={styles.timeline}>
          {logs.map((log, index) => (
            <View key={log.id} style={styles.logRow}>
              {/* Timeline Line */}
              {index !== logs.length - 1 && <View style={styles.line} />}
              
              <View style={[styles.iconWrapper, { backgroundColor: getIconBg(log.type) }]}>
                {getIcon(log.type)}
              </View>
              
              <GlassCard style={styles.logCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.actionText}>{log.action}</Text>
                  <Text style={styles.dateText}>{log.date}</Text>
                </View>
                <Text style={styles.detailsText}>{log.details}</Text>
                <Text style={styles.ipText}>IP: {log.ip}</Text>
              </GlassCard>
            </View>
          ))}
        </View>
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
    marginBottom: spacing.xxl,
  },
  timeline: {
    paddingLeft: spacing.md,
  },
  logRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    left: 19,
    top: 40,
    bottom: -spacing.xl,
    width: 2,
    backgroundColor: colors.borderLight,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
    zIndex: 1,
  },
  logCard: {
    flex: 1,
    padding: spacing.md,
    paddingVertical: spacing.md,
  },
  cardHeader: {
    flexDirection: 'column',
    marginBottom: spacing.xs,
  },
  actionText: {
    color: colors.primaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  dateText: {
    color: colors.accentMint,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  detailsText: {
    color: colors.secondaryText,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  ipText: {
    color: colors.disabledText,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: 4,
  }
});
