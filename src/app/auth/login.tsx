import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button, Card } from '../../components/ui';
import { theme } from '../../theme';
import { AuthService } from '../../services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    
    setIsLoading(true);
    try {
      await AuthService.signInByEmail(db, email.trim());
      // Auth state listener in _layout will handle routing
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error(e instanceof Error ? e.message : String(e));
      Alert.alert('Login Failed', e.message || 'No account found with this email on this device.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <Typography variant="hero" color={theme.colors.primary}>Evento</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            Manage your wedding securely.
          </Typography>
        </View>

        <Card style={styles.card}>
          <Typography variant="sectionTitle" style={styles.cardTitle}>Welcome Back</Typography>
          
          <TextInput
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Button 
            label="Login" 
            onPress={handleLogin} 
            isLoading={isLoading} 
            style={styles.loginBtn}
          />

          <View style={styles.footer}>
            <Typography variant="body" color={theme.colors.textSecondary}>Don't have an account? </Typography>
            <Pressable onPress={() => router.push('/auth/signup')}>
              <Typography variant="body" color={theme.colors.primary} weight="bold">Sign Up</Typography>
            </Pressable>
          </View>
        </Card>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
  },
  card: {
    padding: theme.spacing.xl,
  },
  cardTitle: {
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  loginBtn: {
    marginTop: theme.spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xxl,
  }
});
