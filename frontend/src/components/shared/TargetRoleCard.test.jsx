import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TargetRoleCard from './TargetRoleCard';

describe('TargetRoleCard', () => {
  it('renders the target role and eyebrow', () => {
    render(<TargetRoleCard targetRole="Frontend Developer" address="" remoteFriendly={false} profileCompleteness={null} topGap={null} />);

    expect(screen.getByText('Target role')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('renders the location line with remote-friendly', () => {
    render(<TargetRoleCard targetRole="Frontend Developer" address="Cebu City" remoteFriendly profileCompleteness={null} topGap={null} />);

    expect(screen.getByText('Cebu City · Remote friendly')).toBeInTheDocument();
  });

  it('renders an on-site location when not remote friendly', () => {
    render(<TargetRoleCard targetRole="Frontend Developer" address="Cebu City" remoteFriendly={false} profileCompleteness={null} topGap={null} />);

    expect(screen.getByText('Cebu City · On-site')).toBeInTheDocument();
  });

  it('shows on-site as the location when no address is provided', () => {
    render(<TargetRoleCard targetRole="Frontend Developer" address="" remoteFriendly={false} profileCompleteness={null} topGap={null} />);

    expect(screen.getByText('On-site')).toBeInTheDocument();
  });

  it('shows the profile completeness banner when completeness and top gap exist', () => {
    render(<TargetRoleCard targetRole="Frontend Developer" address="" remoteFriendly={false} profileCompleteness={72} topGap="SQL" />);

    expect(screen.getByText(/Your profile is/)).toBeInTheDocument();
    expect(screen.getByText('72% complete')).toBeInTheDocument();
    expect(screen.getByText(/Add SQL evidence/)).toBeInTheDocument();
  });

  it('hides the banner when completeness is missing', () => {
    render(<TargetRoleCard targetRole="Frontend Developer" address="" remoteFriendly={false} profileCompleteness={null} topGap="SQL" />);

    expect(screen.queryByText(/Your profile is/)).not.toBeInTheDocument();
  });
});