import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { useFajrTheme } from '../../hooks/useFajrTheme';

const PLANS = [
  { id: 'monthly', title: 'Monthly', price: '$3.99 / month', pill: null, pillTone: null },
  { id: 'annual', title: 'Annual', price: '$29.99 / year', pill: 'Best value', pillTone: 'gold' },
  { id: 'lifetime', title: 'Lifetime', price: '$59.99 one time', pill: 'Own it forever', pillTone: 'sage' },
];

const BENEFITS = [
  'Unlimited custom habits',
  'Full stats history — 30-day & all-time',
  'Streak protection (coming soon)',
  'Custom themes (coming soon)',
];

export default function PaywallModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useFajrTheme();
  const styles = makeStyles({ colors, spacing, radii });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('annual');

  const close = () => router.back();

  const onStartPlus = () => {
    if (isLoading) return;
    const plan = selectedPlan;
    setIsLoading(true);
    setTimeout(() => {
      console.log('purchase triggered:', plan);
      setIsLoading(false);
    }, 1500);
  };

  const onRestore = () => {
    console.log('restore triggered');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topSpacer} />
        <View style={styles.badgeWrap}>
          <Text style={[typography.label, styles.badge]}>✦ Fajr+</Text>
        </View>
        <View style={styles.topSpacer}>
          <Pressable
            onPress={close}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={[typography.heading, styles.closeTxt]}>×</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.displayLarge, styles.heading]}>Invest in your deen.</Text>
        <Text style={[typography.body, styles.subheading]}>
          Your subscription is{'\n'}sadaqah jaariyah.
        </Text>

        <View style={styles.charityCard}>
          <Text style={[typography.body, styles.charityTxt]}>
            50% of every Fajr+ subscription goes to{'\n'}
            <Text style={styles.charityEm}>[CHARITY PLACEHOLDER]</Text>
            {' — may Allah accept it from you and us.'}
          </Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((line) => (
            <View key={line} style={styles.benefitRow}>
              <Text style={[typography.body, styles.check]}>✓</Text>
              <Text style={[typography.body, styles.benefitTxt]}>{line}</Text>
            </View>
          ))}
        </View>

        {PLANS.map((plan) => {
          const selected = selectedPlan === plan.id;
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id)}
              style={[
                styles.planCard,
                selected ? { borderColor: colors.accent } : { borderColor: colors.divider },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={styles.planTop}>
                <Text style={[typography.subheading, styles.planTitle]}>{plan.title}</Text>
                {plan.pill ? (
                  <View
                    style={[
                      styles.pill,
                      plan.pillTone === 'gold' && { backgroundColor: colors.plusGold + '33', borderColor: colors.plusGold },
                      plan.pillTone === 'sage' && {
                        backgroundColor: colors.primary + '22',
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        styles.pillTxt,
                        plan.pillTone === 'gold' && { color: colors.plusGold },
                        plan.pillTone === 'sage' && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {plan.pill}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[typography.body, styles.planPrice]}>{plan.price}</Text>
            </Pressable>
          );
        })}

        <Button
          title="Start Fajr+"
          loading={isLoading}
          onPress={onStartPlus}
          style={styles.cta}
        />

        <Pressable onPress={onRestore} style={styles.restoreWrap} hitSlop={8}>
          <Text style={[typography.caption, styles.restoreTxt]}>Restore purchases</Text>
        </Pressable>

        <Text style={[typography.caption, styles.legal]}>
          Subscriptions renew automatically. Cancel anytime in your device settings. Lifetime purchase is a
          one-time non-consumable.
        </Text>
      </ScrollView>
    </View>
  );
}

function makeStyles({ colors, spacing, radii }) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    topSpacer: {
      width: 44,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    badgeWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      color: colors.plusGold,
      letterSpacing: 1,
    },
    closeBtn: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    closeTxt: {
      color: colors.textPrimary,
      marginBottom: 0,
      lineHeight: 28,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    heading: {
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    subheading: {
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacing.lg,
    },
    charityCard: {
      borderWidth: 2,
      borderColor: colors.plusGold,
      borderRadius: radii.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
      marginBottom: spacing.lg,
    },
    charityTxt: {
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 22,
    },
    charityEm: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    benefits: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    check: {
      color: colors.primary,
      fontWeight: '700',
      width: 22,
    },
    benefitTxt: {
      flex: 1,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    planCard: {
      borderWidth: 2,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.surface,
    },
    planTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    planTitle: {
      color: colors.textPrimary,
      flexShrink: 1,
    },
    pill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    pillTxt: {
      fontWeight: '600',
    },
    planPrice: {
      color: colors.textSecondary,
    },
    cta: {
      marginTop: spacing.md,
      width: '100%',
      alignSelf: 'stretch',
    },
    restoreWrap: {
      alignSelf: 'center',
      marginTop: spacing.md,
      paddingVertical: spacing.xs,
    },
    restoreTxt: {
      color: colors.textMuted,
    },
    legal: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
      lineHeight: 18,
    },
  });
}
