import React, { useState } from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';
import { Typography } from './Typography';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Strips the default bordered/padded pill chrome so a caller can fully
   * control the visual container via `style` (e.g. chat composers) without
   * ending up with two nested boxes with mismatched padding/radius.
   */
  bare?: boolean;
}

export function TextInput({
  label,
  error,
  leftIcon,
  rightIcon,
  style,
  containerStyle,
  bare,
  onFocus,
  onBlur,
  ...props
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { theme } = useTheme();

  return (
    <View style={[bare ? styles.containerBare : styles.container, containerStyle]}>
      {label && (
        <Typography
          variant="caption"
          weight="medium"
          color={theme.colors.textSecondary}
          style={styles.label}
        >
          {label}
        </Typography>
      )}
      <View
        style={[
          bare
            ? styles.inputContainerBare
            : [
                styles.inputContainer,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                isFocused && { borderColor: theme.colors.primary },
                error && { borderColor: theme.colors.error },
              ],
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <RNTextInput
          style={[styles.input, { color: theme.colors.text }, style]}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && (
        <Typography variant="caption" color={theme.colors.error} style={styles.errorText}>
          {error}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  containerBare: {},
  inputContainerBare: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 56,
    paddingHorizontal: 24,
  },
  input: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    paddingVertical: 8,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  errorText: {
    marginTop: spacing.xs,
  },
});
