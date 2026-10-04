import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>404 — Page Not Found</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Return to Admin Portal</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  link: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#059669',
    borderRadius: 8,
  },
  linkText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
