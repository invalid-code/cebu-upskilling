import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Field from './Field';

describe('Field', () => {
  it('renders a visible label bound to the control and passes id', () => {
    render(<Field id="email" label="Email"><input /></Field>);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'email');
    expect(screen.getByText('Email').tagName).toBe('LABEL');
  });

  it('links hint to the control via aria-describedby and is not invalid', () => {
    render(<Field id="email" label="Email" hint="Work address"><input /></Field>);
    const input = screen.getByLabelText('Email');
    expect(screen.getByText('Work address')).toHaveAttribute('id', 'email-hint');
    expect(input).toHaveAttribute('aria-describedby', 'email-hint');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error as an alert, sets aria-invalid and links hint plus error', () => {
    render(<Field id="email" label="Email" hint="Work address" error="Required"><input /></Field>);
    const input = screen.getByLabelText('Email');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-hint email-error');
  });

  it('clears aria-invalid and the error as soon as the error prop is removed', () => {
    const { rerender } = render(<Field id="email" label="Email" error="Required"><input /></Field>);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    rerender(<Field id="email" label="Email"><input /></Field>);
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('preserves an existing aria-describedby on the child', () => {
    render(<Field id="x" label="X" hint="h"><input aria-describedby="extra" /></Field>);
    expect(screen.getByLabelText('X')).toHaveAttribute('aria-describedby', 'extra x-hint');
  });

  it('supports a render-prop child receiving control props', () => {
    render(
      <Field id="n" label="Name" error="Bad">
        {(props) => <input {...props} data-testid="ctl" />}
      </Field>,
    );
    const ctl = screen.getByTestId('ctl');
    expect(ctl).toHaveAttribute('id', 'n');
    expect(ctl).toHaveAttribute('aria-invalid', 'true');
    expect(ctl).toHaveAttribute('aria-describedby', 'n-error');
  });
});
