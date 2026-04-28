import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFajrTheme } from '../hooks/useFajrTheme';
import { Button } from './Button';

/**
 * In-app message dialog (replaces system Alert) using Fajr theme tokens.
 * Set `dismiss: false` on an action to keep the modal open (e.g. second confirmation step).
 * @param {{
 *   dialog: null | {
 *     title: string,
 *     message: string,
 *     actions: {
 *       label: string,
 *       onPress?: () => void | Promise<void>,
 *       variant?: 'primary' | 'secondary' | 'ghost' | 'danger',
 *       dismiss?: boolean,
 *     }[],
 *   },
 *   onDismiss: () => void,
 * }} props
 */
export function ThemedMessageModal({ dialog, onDismiss }) {
  const { colors, typography, spacing, radii, shadows } = useFajrTheme();
  const styles = makeStyles({ colors, spacing, radii });

  if (!dialog) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Pressable onPress={(e) => e.stopPropagation()} style={[styles.card, shadows.card]}>
          <Text style={[typography.heading, styles.title]}>{dialog.title}</Text>
          <Text style={[typography.body, styles.message]}>{dialog.message}</Text>
          <View style={styles.actions}>
            {dialog.actions.map((action, index) => (
              action.variant === 'danger' ? (
                <Pressable
                  key={`${action.label}-${index}`}
                  onPress={() => {
                    void action.onPress?.();
                    if (action.dismiss !== false) onDismiss();
                  }}
                  style={({ pressed }) => [
                    styles.dangerBtn,
                    pressed && styles.dangerBtnPressed,
                    styles.btn,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={[typography.body, styles.dangerBtnTxt]}>{action.label}</Text>
                </Pressable>
              ) : (
                <Button
                  key={`${action.label}-${index}`}
                  title={action.label}
                  variant={action.variant || 'primary'}
                  onPress={() => {
                    void action.onPress?.();
                    if (action.dismiss !== false) onDismiss();
                  }}
                  style={styles.btn}
                />
              )
            ))}
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

function makeStyles({ colors, spacing, radii }) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.divider,
      padding: spacing.lg,
      maxWidth: 400,
      width: '100%',
      alignSelf: 'center',
    },
    title: {
      color: colors.textPrimary,
      textAlign: 'center',
    },
    message: {
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 22,
    },
    actions: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    btn: {
      alignSelf: 'stretch',
    },
    dangerBtn: {
      borderRadius: radii.xl,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.danger,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    dangerBtnPressed: {
      opacity: 0.88,
    },
    dangerBtnTxt: {
      color: '#ffffff',
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
