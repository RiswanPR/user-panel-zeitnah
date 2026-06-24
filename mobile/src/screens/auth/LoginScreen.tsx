import React, { useState } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { GlassCard } from '../../components/cards/GlassCard';
import { CustomInput } from '../../components/inputs/CustomInput';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import { useAuthStore } from '../../store/authStore';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type EmailFormData = z.infer<typeof emailSchema>;

export const LoginScreen = ({ navigation }: any) => {
  const { sendOtp } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' }
  });

  const onSubmit = async (data: EmailFormData) => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      await sendOtp(data);
      // Navigate to OTP Verification, passing the email
      navigation.navigate('OtpVerification', { email: data.email });
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Enter your email address to continue</Text>
          </View>

          <GlassCard style={styles.card}>
            {errorMsg ? <Text style={styles.globalError}>{errorMsg}</Text> : null}
            
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <CustomInput
                  label="Email Address"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon={<Mail color={colors.secondaryText} size={20} />}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <PrimaryButton
              title="Continue"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              style={styles.loginButton}
            />
          </GlassCard>

        </ScrollView>

      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  headerContainer: {
    marginBottom: spacing.xxxl,
    alignItems: 'center',
  },
  title: {
    color: colors.primaryText,
    fontSize: typography.sizes.xxxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.secondaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  card: {
    padding: spacing.xl,
  },
  loginButton: {
    marginTop: spacing.xl,
  },
  globalError: {
    color: colors.error,
    backgroundColor: colors.errorBg,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
  }
});
