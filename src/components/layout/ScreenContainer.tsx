import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  backgroundColor?: string;
  statusBarStyle?: 'dark-content' | 'light-content';
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  backgroundColor = colors.background,
  statusBarStyle = 'dark-content',
}) => {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      {scrollable ? (
        <ScrollView
          style={[styles.container, style]}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
