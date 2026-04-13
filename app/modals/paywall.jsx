import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Purchases from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { HabitCompletionRitual } from '../../components/HabitCompletionRitual';
import { ThemedMessageModal } from '../../components/ThemedMessageModal';
import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { checkPlusEntitlement, restorePurchases as restorePurchasesRc } from '../../utils/purchases';

const PLAN_DEFS = [
  {
    id: 'monthly',
    titleKey: 'paywall.planMonthly',
    priceKey: 'paywall.priceMonthly',
    priceSuffixKey: 'paywall.priceSuffixMonthly',
    pillKey: null,
    pillTone: null,
  },
  {
    id: 'annual',
    titleKey: 'paywall.planAnnual',
    priceKey: 'paywall.priceAnnual',
    priceSuffixKey: 'paywall.priceSuffixAnnual',
    pillKey: 'paywall.pillBestValue',
    pillTone: 'gold',
  },
  {
    id: 'lifetime',
    titleKey: 'paywall.planLifetime',
    priceKey: 'paywall.priceLifetime',
    priceSuffixKey: 'paywall.priceSuffixLifetime',
    pillKey: 'paywall.pillOwnForever',
    pillTone: 'sage',
  },
];

const BENEFIT_KEYS = ['paywall.benefit1', 'paywall.benefit2', 'paywall.benefit3', 'paywall.benefit4'];

function isPurchaseCancelled(error) {
  if (!error) return false;
  if (error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return true;
  if (error.userInfo?.readableErrorCode === 'PURCHASE_CANCELLED') return true;
  return false;
}

export default function PaywallModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dispatch } = useApp();
  const { colors, typography, spacing, radii } = useFajrTheme();
  const styles = makeStyles({ colors, spacing, radii });

  const plans = useMemo(
    () =>
      PLAN_DEFS.map((def) => ({
        ...def,
        title: t(def.titleKey),
        price: t(def.priceKey),
        priceSuffix: t(def.priceSuffixKey),
        pill: def.pillKey ? t(def.pillKey) : null,
      })),
    [t]
  );

  const benefits = useMemo(() => BENEFIT_KEYS.map((key) => t(key)), [t]);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [packages, setPackages] = useState({
    monthly: null,
    annual: null,
    lifetime: null,
  });
  const [dialog, setDialog] = useState(null);
  const [purchaseRitualOn, setPurchaseRitualOn] = useState(false);
  const [offeringsReady, setOfferingsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (current && !cancelled) {
          const PT = Purchases.PACKAGE_TYPE;
          let monthly = null;
          let annual = null;
          let lifetime = null;
          for (const pkg of current.availablePackages) {
            if (pkg.packageType === PT.MONTHLY) monthly = pkg;
            else if (pkg.packageType === PT.ANNUAL) annual = pkg;
            else if (pkg.packageType === PT.LIFETIME) lifetime = pkg;
          }
          setPackages({ monthly, annual, lifetime });
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[Paywall] getOfferings failed', e?.message ?? e);
        }
      } finally {
        if (!cancelled) setOfferingsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getPackageForPlanId = useCallback(
    (id) => {
      if (id === 'monthly') return packages.monthly;
      if (id === 'annual') return packages.annual;
      if (id === 'lifetime') return packages.lifetime;
      return null;
    },
    [packages.monthly, packages.annual, packages.lifetime]
  );

  const close = () => router.back();

  const onStartPlus = async () => {
    if (isLoading) return;
    const selectedPackage = getPackageForPlanId(selectedPlan);
    if (!selectedPackage) {
      setDialog({
        title: t('paywall.unavailableTitle'),
        message: t('paywall.unavailableMsg'),
        actions: [{ label: t('common.ok') }],
      });
      return;
    }
    setIsLoading(true);
    try {
      await Purchases.purchasePackage(selectedPackage);
    } catch (e) {
      if (isPurchaseCancelled(e)) {
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setDialog({
        title: t('paywall.purchaseFailedTitle'),
        message: e?.message || t('paywall.purchaseFailedMsg'),
        actions: [{ label: t('common.ok') }],
      });
      return;
    }
    const entitled = await checkPlusEntitlement();
    setIsLoading(false);
    if (entitled) {
      dispatch({ type: ActionTypes.SET_PLUS, payload: true });
      setPurchaseRitualOn(true);
    } else {
      setDialog({
        title: t('paywall.pendingTitle'),
        message: t('paywall.pendingMsg'),
        actions: [{ label: t('common.ok') }],
      });
    }
  };

  const onRestore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const ok = await restorePurchasesRc();
      if (ok) {
        dispatch({ type: ActionTypes.SET_PLUS, payload: true });
        setDialog({
          title: t('paywall.restoredTitle'),
          message: t('paywall.restoredMsg'),
          actions: [{ label: t('common.ok') }],
        });
      } else {
        setDialog({
          title: t('paywall.restoreNoneTitle'),
          message: t('paywall.restoreNoneMsg'),
          actions: [{ label: t('common.ok') }],
        });
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[Paywall] onRestore', e);
      }
      setDialog({
        title: t('paywall.restoreFailedTitle'),
        message: e?.message || t('paywall.restoreFailedMsg'),
        actions: [{ label: t('common.ok') }],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.topRow, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.topSpacer} />
          <View style={styles.badgeWrap}>
            <Text style={[typography.label, styles.badge]}>{t('paywall.badge')}</Text>
          </View>
          <View style={styles.topSpacer}>
            <Pressable
              onPress={close}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('paywall.a11yClose')}
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
          <Text style={[typography.displayLarge, styles.heading]}>{t('paywall.heading')}</Text>
          <Text style={[typography.body, styles.subheading]}>{t('paywall.subheading')}</Text>

          <View style={styles.charityCard}>
            <Text style={[typography.body, styles.charityTxt]}>
              {t('paywall.charityIntro')}
              {'\n'}
              <Text style={styles.charityEm}>{t('paywall.charityName')}</Text>
              {t('paywall.charityOutro')}
            </Text>
          </View>

          <View style={styles.benefits}>
            {benefits.map((line, index) => (
              <View key={`paywall-benefit-${index}`} style={styles.benefitRow}>
                <Text style={[typography.body, styles.check]}>✓</Text>
                <Text style={[typography.body, styles.benefitTxt]}>{line}</Text>
              </View>
            ))}
          </View>

          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            const pkg = getPackageForPlanId(plan.id);
            const storePrice = pkg?.product?.priceString;
            const priceLabel = storePrice
              ? `${storePrice}${plan.priceSuffix}`
              : offeringsReady
                ? plan.price
                : '\u2007';
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
                        plan.pillTone === 'gold' && {
                          backgroundColor: colors.plusGold + '33',
                          borderColor: colors.plusGold,
                        },
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
                <Text style={[typography.body, styles.planPrice]}>{priceLabel}</Text>
              </Pressable>
            );
          })}

          <Button title={t('paywall.cta')} loading={isLoading} onPress={onStartPlus} style={styles.cta} />

          <Pressable onPress={onRestore} style={styles.restoreWrap} hitSlop={8} disabled={isLoading}>
            <Text style={[typography.caption, styles.restoreTxt]}>{t('paywall.restore')}</Text>
          </Pressable>

          <Text style={[typography.caption, styles.legal]}>{t('paywall.legal')}</Text>
        </ScrollView>
      </View>
      <HabitCompletionRitual
        visible={purchaseRitualOn}
        showHeadline={false}
        onFinished={() => {
          setPurchaseRitualOn(false);
          setDialog({
            title: t('paywall.welcomeTitle'),
            message: t('paywall.welcomeMsg'),
            actions: [{ label: t('common.ok'), onPress: () => router.back() }],
          });
        }}
      />
      <ThemedMessageModal dialog={dialog} onDismiss={() => setDialog(null)} />
    </>
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
