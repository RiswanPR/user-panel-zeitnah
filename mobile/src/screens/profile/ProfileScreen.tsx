import React from 'react';
import { View, StyleSheet, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { LogOut, Settings, CreditCard, Shield, HelpCircle, ChevronRight, Edit3, Smartphone, FileText } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AnimatedHeader } from '../../components/layout/AnimatedHeader';
import { colors, spacing, typography, shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';

type ProfileScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

export const ProfileScreen = () => {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.log('Failed to logout', error);
    }
  };

  const renderOption = (icon: React.ReactNode, title: string, subtitle?: string, onPress?: () => void) => (
    <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.optionLeft}>
        <View style={styles.optionIconContainer}>
          {icon}
        </View>
        <View>
          <Text style={styles.optionTitle}>{title}</Text>
          {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <ChevronRight color={colors.secondaryText} size={20} />
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <AnimatedHeader title="Profile" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Profile Section */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: user?.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80' }} 
              style={styles.avatar} 
            />
            <TouchableOpacity style={styles.editBadge}>
              <Edit3 color={colors.primaryBg} size={14} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.name}>{user?.name || 'Student Name'}</Text>
          <Text style={styles.email}>{user?.email || 'student@zeitnah.com'}</Text>
          <Text style={styles.phone}>{user?.mobile || '+1 234 567 8900'}</Text>

          <View style={styles.memberBadge}>
            <Text style={styles.memberText}>PREMIUM MEMBER</Text>
            <Text style={styles.memberSince}>Since Oct 2023</Text>
          </View>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.optionsCard}>
            {renderOption(<Settings color={colors.accentYellow} size={20} />, 'Account Settings', 'Personal info, password')}
            {renderOption(<CreditCard color={colors.accentYellow} size={20} />, 'Billing & Membership', 'Payment methods, invoices')}
          </View>

          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.optionsCard}>
            {renderOption(<Smartphone color={colors.accentYellow} size={20} />, 'Active Sessions', 'Manage connected devices', () => navigation.navigate('Sessions'))}
            {renderOption(<FileText color={colors.accentYellow} size={20} />, 'Audit Log', 'Recent security activity', () => navigation.navigate('AuditLog'))}
          </View>

          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.optionsCard}>
            {renderOption(<HelpCircle color={colors.accentYellow} size={20} />, 'Help Center', 'FAQs and contact support')}
            {renderOption(<Shield color={colors.accentYellow} size={20} />, 'Privacy Policy', 'Data usage and security')}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color={colors.error} size={20} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 120, // space for tab bar
    paddingHorizontal: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    marginTop: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.accentMint,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.accentYellow,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryBg,
  },
  name: {
    color: colors.primaryText,
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  email: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    marginBottom: 4,
  },
  phone: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    marginBottom: spacing.lg,
  },
  memberBadge: {
    backgroundColor: 'rgba(159, 213, 178, 0.1)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(159, 213, 178, 0.2)',
  },
  memberText: {
    color: colors.accentYellow,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  memberSince: {
    color: colors.secondaryText,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  optionsContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.primaryText,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  optionsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(159, 213, 178, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionTitle: {
    color: colors.primaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.semibold,
  },
  optionSubtitle: {
    color: colors.secondaryText,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBg,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.errorBg,
  },
  logoutText: {
    color: colors.error,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
  }
});
