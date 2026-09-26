import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Modal from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Hello">Body</Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title and children when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm" eyebrow="Step 2">
        <p>Are you sure?</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Confirm">Body</Modal>);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Confirm">Body</Modal>);
    fireEvent.click(screen.getByRole('dialog').parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer content when provided', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm" footer={<button>Cancel</button>}>
        Body
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});

describe('Modal focus management', () => {
  it('moves focus into the dialog when opened and restores it on close', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open';
    document.body.appendChild(opener);
    opener.focus();

    const { rerender, unmount } = render(<Modal open={false} onClose={vi.fn()} title="Confirm">Body</Modal>);
    rerender(<Modal open onClose={vi.fn()} title="Confirm">Body</Modal>);

    expect(document.activeElement).toBe(screen.getByRole('dialog'));

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Confirm">Body</Modal>);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab inside the dialog', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm" footer={<button>Cancel</button>}>
        <button>Confirm action</button>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const nodes = Array.from(dialog.querySelectorAll('button'));
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
