import React from 'react';
import { LegalPageLayout } from '../components/legal/LegalPageLayout';
import { COMMUNITY_GUIDELINES } from '../constants/legalPolicies';

export default function GuidelinesScreen() {
  return <LegalPageLayout document={COMMUNITY_GUIDELINES} />;
}
