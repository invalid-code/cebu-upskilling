import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.mock('./api/client', () => ({
  api: { get: vi.fn().mockResolvedValue([]), post: vi.fn() },
}));

describe('App routing', () => {
  it('redirects unauthenticated users to the login page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('renders the protected dashboard for authenticated users', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ firstName: 'Jose', role: 'learner' }),
    );
    localStorage.setItem('token', 'abc');
    render(<App />);
    expect(await screen.findByText('Your next move is clear.')).toBeInTheDocument();
  });
});
