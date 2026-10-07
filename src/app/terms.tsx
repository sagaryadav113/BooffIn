import React from 'react';
import { Redirect } from 'expo-router';

export default function TermsScreen() {
  return <Redirect href="/(auth)/welcome?tab=terms" />;
}

