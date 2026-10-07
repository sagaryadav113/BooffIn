import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';
import { PRIVACY_POLICY } from '../../constants/legalPolicies';

export default function WelcomePolicyScreen() {
  return <LegalPageLayout document={PRIVACY_POLICY} />;
}
