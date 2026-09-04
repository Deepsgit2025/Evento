import React from 'react';
import { TextInput, TextInputProps } from './TextInput';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export function SearchInput(props: Omit<TextInputProps, 'leftIcon'>) {
  const { theme } = useTheme();

  return (
    <TextInput
      placeholder="Search..."
      leftIcon={<Ionicons name="search" size={20} color={theme.colors.textMuted} />}
      {...props}
    />
  );
}
