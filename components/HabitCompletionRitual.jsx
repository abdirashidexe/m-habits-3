import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  UIManager,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { useFajrTheme } from '../hooks/useFajrTheme';

const PARTICLE_COUNT = 28;
const REDUCE_MOTION_CLOSE_DELAY_MS = 900;
const BURST_DURATION_MS = 720;

const PARTICLE_SCALE_PEAK_DURATION_MS = 180;
const PARTICLE_SCALE_FADE_DURATION_MS = 540;

const PARTICLE_OPACITY_FADE_MS = 700;
const PARTICLE_OPACITY_DELAY_MS = 80;

const PARTICLE_START_SCALE = 0.4;
const PARTICLE_MID_SCALE = 1.1;
const PARTICLE_END_SCALE = 0.2;

const ANGLE_JITTER = 0.4;
const BASE_DISTANCE = 120;
const DISTANCE_SPREAD = 100;
const VERTICAL_LIFT = 40;

/**
 * @param {{ visible: boolean, onFinished: () => void }} props
 */
export function HabitCompletionRitual({ visible, onFinished }) {
  const { t } = useTranslation();
  const { colors, typography, spacing } = useFajrTheme();
  const styles = makeStyles({ colors, spacing });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [renderTick, setRenderTick] = useState(0);
  const particlesRef = useRef([]);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => setReduceMotion(Boolean(isEnabled)));
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (isEnabled) =>
      setReduceMotion(Boolean(isEnabled))
    );
    return () => {
      if (sub && typeof sub.remove === 'function') sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (Platform.OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (reduceMotion) {
      const t = setTimeout(() => onFinishedRef.current(), REDUCE_MOTION_CLOSE_DELAY_MS);
      return () => clearTimeout(t);
    }

    const palette = [colors.primary, colors.accent, colors.plusGold, colors.success];

    const buildAngle = (index) => (index / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * ANGLE_JITTER;

    const particles = Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      key: `${index}-${Date.now()}`,
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(PARTICLE_START_SCALE),
      color: palette[index % palette.length],
    }));

    particlesRef.current = particles;
    setRenderTick((v) => v + 1);

    const particleAnimations = particles.map((p, index) => {
      const distance = BASE_DISTANCE + Math.random() * DISTANCE_SPREAD;
      const angle = buildAngle(index);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - VERTICAL_LIFT;

      const moveX = Animated.timing(p.x, {
        toValue: dx,
        duration: BURST_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      const moveY = Animated.timing(p.y, {
        toValue: dy,
        duration: BURST_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

      const scaleUp = Animated.timing(p.scale, {
        toValue: PARTICLE_MID_SCALE,
        duration: PARTICLE_SCALE_PEAK_DURATION_MS,
        useNativeDriver: true,
      });
      const scaleDown = Animated.timing(p.scale, {
        toValue: PARTICLE_END_SCALE,
        duration: PARTICLE_SCALE_FADE_DURATION_MS,
        useNativeDriver: true,
      });

      const fadeOut = Animated.timing(p.opacity, {
        toValue: 0,
        duration: PARTICLE_OPACITY_FADE_MS,
        delay: PARTICLE_OPACITY_DELAY_MS,
        useNativeDriver: true,
      });

      return Animated.parallel([moveX, moveY, Animated.sequence([scaleUp, scaleDown]), fadeOut]);
    });

    Animated.parallel(particleAnimations).start(() => onFinishedRef.current());

    return () => {
      for (const p of particles) {
        p.x.stopAnimation();
        p.y.stopAnimation();
        p.opacity.stopAnimation();
        p.scale.stopAnimation();
      }
    };
  }, [visible, reduceMotion, colors.primary, colors.accent, colors.plusGold, colors.success]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay} pointerEvents="none">
        {Platform.OS !== 'web' ? (
          // Guard: BlurView can be unavailable in some runtimes (e.g. web / non-native clients)
          <SafeBlur />
        ) : null}
        <Text style={[typography.heading, styles.title]}>{t('ritual.title')}</Text>
        <Text style={[typography.body, styles.sub]}>{t('ritual.sub')}</Text>

        {!reduceMotion ? (
          <View style={styles.burst} key={renderTick}>
            {particlesRef.current.map((p) => (
              <Animated.View
                key={p.key}
                style={[
                  styles.particle,
                  {
                    backgroundColor: p.color,
                    opacity: p.opacity,
                    transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

class BlurErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function SafeBlur() {
  try {
    // In some runtimes (e.g. missing native module / incompatible build),
    // rendering BlurView throws a redbox "Unimplemented component: <ViewManagerAdapter_ExpoBlur_...>".
    // We guard against that by ensuring the native view manager is actually registered.
    const hasConfig =
      typeof UIManager?.getViewManagerConfig === 'function' &&
      (Boolean(UIManager.getViewManagerConfig('ExpoBlurView')) ||
        Boolean(UIManager.getViewManagerConfig('ViewManagerAdapter_ExpoBlur_ExpoBlurView')));
    if (!hasConfig) {
      return null;
    }

    // eslint-disable-next-line global-require
    const { BlurView } = require('expo-blur');

    function BlurProbe() {
      useEffect(() => {}, []);
      return <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} />;
    }

    return (
      <BlurErrorBoundary>
        <BlurProbe />
      </BlurErrorBoundary>
    );
  } catch (e) {
    return null;
  }
}

function makeStyles({ colors, spacing }) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    title: {
      color: '#FFFCF7',
      marginBottom: 6,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    sub: {
      color: 'rgba(255,255,255,0.88)',
      marginBottom: 120,
      fontWeight: '600',
    },
    burst: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    particle: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: -4,
      marginTop: -4,
    },
  });
}

