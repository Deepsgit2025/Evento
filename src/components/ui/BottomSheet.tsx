import React from 'react';
import { View, StyleSheet, Modal, Pressable, KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radii } from '../../theme';
import { Typography } from './Typography';
import { IconButton } from './IconButton';
import { Ionicons } from '@expo/vector-icons';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function BottomSheet({ visible, onClose, title, children, style }: BottomSheetProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }, theme.shadows.md, style]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          <View style={styles.header}>
            {title ? (
              <Typography variant="sectionTitle">{title}</Typography>
            ) : <View />}
            <IconButton
              icon={<Ionicons name="close" size={24} color={theme.colors.textSecondary} />}
              onPress={onClose}
            />
          </View>

          <View style={styles.content}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    maxHeight: '80%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  content: {
    // Content can scroll if needed inside children
  },
});
