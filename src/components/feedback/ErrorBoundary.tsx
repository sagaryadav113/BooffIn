import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { colors, spacing } from '../../theme';
import { Typography } from '../core/Typography';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('⚠️ [BooffIn Caught Render Error]:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.iconCircle}>
              <Icon name="AlertTriangle" size="xl" color={colors.accentRed} />
            </View>

            <Typography variant="h2" align="center" style={styles.title}>
              Something went wrong
            </Typography>

            <Typography
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.message}
            >
              {this.state.error?.message ||
                'An unexpected error occurred in the application view.'}
            </Typography>

            {this.state.error?.stack ? (
              <Typography
                variant="micro"
                color={colors.textMuted}
                align="center"
                style={styles.stackText}
              >
                {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
              </Typography>
            ) : null}

            <Button
              title="Try Again"
              variant="primary"
              size="md"
              onPress={this.handleReset}
              style={styles.retryButton}
            />
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  message: {
    marginBottom: spacing.md,
    maxWidth: 300,
  },
  stackText: {
    marginBottom: spacing.lg,
    maxWidth: 320,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    opacity: 0.8,
  },
  retryButton: {
    minWidth: 140,
  },
});
