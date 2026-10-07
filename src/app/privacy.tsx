import React from 'react';
import { Redirect } from 'expo-router';

export default function PrivacyScreen() {
  return <Redirect href="/(auth)/welcome?tab=privacy" />;
}

