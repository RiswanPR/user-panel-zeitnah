import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { GlassCard } from '../../components/cards/GlassCard';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export const OtpVerificationScreen = ({ route, navigation }: any) => {
  const { email } = route.params;
  const { verifyOtp, sendOtp } = useAuthStore();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timer, setTimer] = useState(60);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Focus first input on mount
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 500);
  }, []);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      // Focus last filled
      const lastIndex = Math.min(index + pastedOtp.length, 5);
      inputRefs.current[lastIndex]?.focus();
      if (newOtp.every(val => val !== '')) {
        handleSubmit(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if full
    if (newOtp.every(val => val !== '')) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otp[index] === '') {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (fullOtp: string) => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      await verifyOtp({ email, otp: fullOtp });
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || 'Invalid OTP. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setTimer(60);
      await sendOtp({ email });
    } catch (error: any) {
      setErrorMsg('Failed to resend OTP.');
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft color={colors.primaryText} size={24} />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <Text style={styles.title}>Verification</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>
          </View>

          <GlassCard style={styles.card}>
            {errorMsg ? <Text style={styles.globalError}>{errorMsg}</Text> : null}

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[styles.otpInput, digit !== '' && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={6} // allow paste
                  selectTextOnFocus
                />
              ))}
            </View>

            <PrimaryButton
              title="Verify Code"
              onPress={() => handleSubmit(otp.join(''))}
              isLoading={isLoading}
              disabled={otp.some(val => val === '')}
              style={styles.verifyButton}
            />

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              {timer > 0 ? (
                <Text style={styles.timerText}>Resend in {timer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendLink}>Resend Now</Text>
                </TouchableOpacity>
              )}
            </View>

          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  backButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: colors.cardBg,
  },
  headerContainer: {
    marginBottom: spacing.xxxl,
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
  },
  card: {
    padding: spacing.xl,
  },
  globalError: {
    color: colors.error,
    backgroundColor: colors.errorBg,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: 'rgba(0,0,0,0.2)',
    color: colors.primaryText,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: colors.accentMint,
  },
  verifyButton: {
    marginBottom: spacing.xl,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  timerText: {
    color: colors.primaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  resendLink: {
    color: colors.accentYellow,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  }
});
