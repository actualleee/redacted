import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export default function Toast({ visible, message = 'Saved ✓', color }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 10, duration: 300, useNativeDriver: true }),
          ]).start();
        }, 1200);
      });
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }],
      backgroundColor: color || colors.primary }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, zIndex: 999,
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
