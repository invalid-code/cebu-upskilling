import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TermsOfServicePage from './TermsOfServicePage';

describe('TermsOfServicePage', () => {
  it('renders the terms heading and draft marker', () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText('Draft for review')).toBeInTheDocument();
  });

  it('renders all terms sections', () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>,
    );

    ['Using the platform', 'Courses and learner content', 'Employers and job postings', 'Acceptable use', 'Disclaimers and changes']
      .forEach((title) => expect(screen.getByRole('heading', { name: title })).toBeInTheDocument());
  });

  it('links to the privacy notice', () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>,
    );

    screen.getAllByRole('link', { name: 'Privacy Notice' })
      .forEach((link) => expect(link).toHaveAttribute('href', '/privacy'));
  });
});
