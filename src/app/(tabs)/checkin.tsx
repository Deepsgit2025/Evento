import React from 'react';
import { ComingSoonScreen } from '../../components/ui';

export default function GuestCheckinScreen() {
  return (
    <ComingSoonScreen
      icon="qr-code"
      title="Guest Check-in"
      description="QR-based guest check-in at the entrance is on the roadmap, with live totals for invited vs. arrived guests."
    />
  );
}
