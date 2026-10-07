import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';
import { TERMS_OF_SERVICE } from '../../constants/legalPolicies';

export default function WelcomeTermsScreen() {
  return <LegalPageLayout document={TERMS_OF_SERVICE} />;
}
