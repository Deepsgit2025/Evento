import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button, Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';
import { AuthService } from '../../services/auth';

export default function SignupScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Please enter your name and email.');
      return;
    }
    
    setIsLoading(true);
    try {
      await AuthService.signUp(db, { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined });
      // Push to the wedding creation/join screen
      router.replace('/auth/join');
    } catch (e: any) {
      console.error(e instanceof Error ? e.message : String(e));
      Alert.alert('Signup Failed', e.message || 'Could not create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <Typography variant="hero" color={theme.colors.primary}>Evento</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            Create your account to get started.
          </Typography>
        </View>

        <Card style={styles.card}>
          <Typography variant="sectionTitle" style={styles.cardTitle}>Sign Up</Typography>
          
          <TextInput
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            label="Phone Number"
            placeholder="+91 98765 43210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          
          <Button 
            label="Create Account" 
            onPress={handleSignup} 
            isLoading={isLoading} 
            style={styles.signupBtn}
          />

          <View style={styles.footer}>
            <Typography variant="body" color={theme.colors.textSecondary}>Already have an account? </Typography>
            <Pressable onPress={() => router.push('/auth/login')}>
              <Typography variant="body" color={theme.colors.primary} weight="bold">Login</Typography>
            </Pressable>
          </View>
        </Card>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {},
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  card: {
    padding: spacing.xl,
  },
  cardTitle: {
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  signupBtn: {
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  }
});

