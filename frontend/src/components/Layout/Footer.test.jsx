import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe('Footer', () => {
  it('renders the business links', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: 'Help Center' })).toHaveAttribute('href', '/help');
    expect(screen.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  });

  it('labels the site navigation for assistive tech', () => {
    renderFooter();

    expect(screen.getByRole('navigation', { name: 'Site links' })).toBeInTheDocument();
  });

  it('shows the copyright line', () => {
    renderFooter();

    expect(screen.getByText(/© \d{4} CebuUpskilling/)).toBeInTheDocument();
  });
});
