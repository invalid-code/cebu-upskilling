import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Link } from 'react-router-dom';
import JobPostForm, {
  buildInitialForm,
  validateJobForm,
  serverErrorMessage,
  GENERIC_SAVE_ERROR,
  RATE_LIMIT_FORM_MESSAGE,
} from './JobPostForm';

vi.mock('../../api/client', () => ({ api: { post: vi.fn() } }));

function renderForm(props = {}) {
  return render(
    <MemoryRouter>
      <Link to="/elsewhere">Leave</Link>
      <JobPostForm onSubmit={vi.fn().mockResolvedValue({})} submitLabel="Post job" {...props} />
    </MemoryRouter>,
  );
}

describe('JobPostForm helpers', () => {
  it('requires a title and a valid logo URL', () => {
    const form = buildInitialForm();
    expect(validateJobForm(form).title).toBeTruthy();
    expect(validateJobForm({ ...form, title: 'Dev', companyLogoUrl: 'nope' }).companyLogoUrl).toBeTruthy();
    expect(validateJobForm({ ...form, title: 'Dev' })).toEqual({});
  });

  it('maps server errors to summary messages', () => {
    expect(serverErrorMessage(Object.assign(new Error('Title too long'), { status: 400 }))).toBe('Title too long');
    expect(serverErrorMessage(Object.assign(new Error('HTTP 400'), { status: 400 }))).toBe(GENERIC_SAVE_ERROR);
    expect(serverErrorMessage(new Error('[object Object]'))).toBe(GENERIC_SAVE_ERROR);
    expect(serverErrorMessage(Object.assign(new Error('x'), { status: 429 }))).toBe(RATE_LIMIT_FORM_MESSAGE);
  });
});

describe('JobPostForm', () => {
  it('updates the preview as fields change', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/Job title/), 'Backend Dev');
    expect(screen.getByTestId('job-preview')).toHaveTextContent('Backend Dev');
  });

  it('pre-populates from initial values', () => {
    renderForm({ initial: { title: 'Saved title', location: 'Cebu' } });
    expect(screen.getByLabelText(/Job title/)).toHaveValue('Saved title');
    expect(screen.getByTestId('job-preview')).toHaveTextContent('Saved title');
  });

  it('blocks submit on empty title, shows summary and field error, focuses summary', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    await userEvent.type(screen.getByLabelText('Location'), 'Cebu');
    fireEvent.click(screen.getByRole('button', { name: 'Post job' }));
    const summary = await screen.findByTestId('error-summary');
    expect(summary).toHaveFocus();
    expect(summary.querySelectorAll('li')).toHaveLength(1);
    expect(screen.getByLabelText(/Job title/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Location')).toHaveValue('Cebu');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a server 400 error in the summary and keeps values', async () => {
    const err = Object.assign(new Error('Title already used'), { status: 400 });
    renderForm({ onSubmit: vi.fn().mockRejectedValue(err), initial: { title: 'T' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post job' }));
    expect(await screen.findByText('Title already used')).toBeInTheDocument();
    expect(screen.getByLabelText(/Job title/)).toHaveValue('T');
  });

  it('prompts before leaving with unsaved changes and stays on cancel', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/Job title/), 'X');
    fireEvent.click(screen.getByText('Leave'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText(/Job title/)).toHaveValue('X');
  });
});
