import React from 'react';
import { TextInput, TextInputProps } from './TextInput';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export function SearchInput(props: Omit<TextInputProps, 'leftIcon'>) {
  return (
    <TextInput
      placeholder="Search..."
      leftIcon={<Ionicons name="search" size={20} color={theme.colors.textMuted} />}
      {...props}
    />
  );
}
