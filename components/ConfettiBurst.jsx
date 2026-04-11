import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Lightweight confetti burst using Animated.
 * @param {{ active: boolean, colors: string[], onDone?: () => void, style?: any, count?: number, durationMs?: number }} props
 */
export function ConfettiBurst({ active, colors, onDone, style, count = 12, durationMs = 720 }) {
  const pieces = useMemo(() => {
    return [...Array(count)].map((_, i) => ({
      id: i,
      x: rand(-60, 60),
      y: rand(-110, -40),
      r: rand(-120, 120),
      size: rand(6, 10),
      color: colors[i % colors.length],
      delay: Math.floor(rand(0, 80)),
    }));
  }, [colors, count]);

  const anim = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!active) return;
    const runs = anim.map((a, idx) =>
      Animated.timing(a, {
        toValue: 1,
        duration: durationMs,
        delay: pieces[idx]?.delay ?? 0,
        useNativeDriver: true,
      })
    );
    Animated.parallel(runs).start(({ finished }) => {
      if (finished && onDone) onDone();
    });
    // reset back to 0 for next burst
    return () => {
      for (const a of anim) a.stopAnimation();
      for (const a of anim) a.setValue(0);
    };
  }, [active, anim, onDone, pieces, durationMs]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, style]}>
      {pieces.map((p, idx) => {
        const a = anim[idx];
        const translateX = a.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] });
        const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, p.y] });
        const rotate = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.r}deg`] });
        const opacity = a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        const scale = a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.9, 1, 0.8] });
        return (
          <Animated.View
            key={p.id}
            style={[
              styles.piece,
              {
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: 1,
    height: 1,
  },
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});

