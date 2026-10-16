import React from 'react';
import { LegalPageLayout } from '../components/legal/LegalPageLayout';
import { ACCOUNT_DELETION_POLICY } from '../constants/legalPolicies';

export default function DeleteAccountScreen() {
  return <LegalPageLayout document={ACCOUNT_DELETION_POLICY} />;
}
