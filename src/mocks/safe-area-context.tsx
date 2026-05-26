import React from 'react';
import { View } from 'react-native';

export const SafeAreaProvider = ({ children }: any) => {
  return <>{children}</>;
};

export const SafeAreaView = ({ children, style, edges }: any) => {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
};

export const useSafeAreaInsets = () => {
  return { top: 0, bottom: 0, left: 0, right: 0 };
};
