// src/components/plant/PlantMascot.js
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

const PLANTS = {
  follicular: require('../../../assets/plants/plant_follicular.png'),
  ovulation:  require('../../../assets/plants/plant_ovulation.png'),
  luteal:     require('../../../assets/plants/plant_luteal.png'),
  menstrual:  require('../../../assets/plants/plant_menstrual.png'),
  unknown:    require('../../../assets/plants/plant_unknown.png'),
};

const HAPPY = ['follicular', 'ovulation', 'unknown'];

export default function PlantMascot({ phase = 'unknown', size = 1 }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    bob.stopAnimation();
    bob.setValue(0);
    if (HAPPY.includes(phase)) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: -4, duration: 1600, useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0,  duration: 1600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [phase]);

  const dim = 90 * size;
  return (
    <Animated.Image
      source={PLANTS[phase] ?? PLANTS.unknown}
      style={{ width: dim, height: dim, transform: [{ translateY: bob }] }}
      resizeMode="contain"
    />
  );
}
