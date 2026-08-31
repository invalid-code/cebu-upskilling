import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PasswordField from './PasswordField';

describe('PasswordField', () => {
  it('renders as password by default with a show button', () => {
    render(<PasswordField value="" onChange={vi.fn()} placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles to text and back on click', () => {
    render(<PasswordField value="secret123" onChange={vi.fn()} placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('forwards placeholder, value, autoComplete and disabled', () => {
    render(
      <PasswordField
        value="abc"
        onChange={vi.fn()}
        placeholder="Enter password"
        autoComplete="current-password"
        disabled
        id="pwd"
      />,
    );
    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveValue('abc');
    expect(input).toHaveAttribute('autoComplete', 'current-password');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('id', 'pwd');
  });

  it('forwards aria-invalid and aria-describedby', () => {
    render(
      <PasswordField
        value=""
        onChange={vi.fn()}
        placeholder="Password"
        aria-invalid={true}
        aria-describedby="err"
      />,
    );
    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'err');
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<PasswordField value="" onChange={onChange} placeholder="Password" />);
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'new' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('uses danger color when aria-invalid is true', () => {
    render(<PasswordField value="" onChange={vi.fn()} placeholder="Password" aria-invalid={true} />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveStyle({ color: 'var(--danger)' });
  });

  it('uses muted color when not invalid', () => {
    render(<PasswordField value="" onChange={vi.fn()} placeholder="Password" />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveStyle({ color: 'var(--muted)' });
  });

  it('injects a style tag that hides native browser reveal icons', () => {
    const { container } = render(<PasswordField value="" onChange={vi.fn()} placeholder="Password" />);
    const styleTag = container.querySelector('style');
    expect(styleTag).not.toBeNull();
    expect(styleTag.textContent).toContain('::-ms-reveal');
    expect(styleTag.textContent).toContain('::-webkit-credentials-auto-fill-button');
    expect(styleTag.textContent).toContain('::-moz-reveal');
  });

  it('has a button with type button so it does not submit forms', () => {
    render(<PasswordField value="" onChange={vi.fn()} placeholder="Password" />);
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('type', 'button');
  });
});
