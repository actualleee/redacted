#!/bin/bash
# Run this to initialize the project
npx create-expo-app@latest redacted --template blank
cd redacted
npx expo install expo-sqlite expo-crypto expo-secure-store expo-file-system expo-sharing expo-local-authentication
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install zustand
npm install react-native-gesture-handler react-native-reanimated
npm install victory-native
npm install date-fns
