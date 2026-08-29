import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import JobPostForm from './JobPostForm';

afterEach(() => cleanup());

describe('JobPostForm — validation', () => {
  it('blocks submit when the title is empty', () => {
    const onSubmit = vi.fn();
    render(<JobPostForm onSubmit={onSubmit} submitting={false} error="" submitLabel="Post job" />);
    fireEvent.click(screen.getByText('Post job'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Job title is required/i).length).toBeGreaterThan(0);
  });

  it('blocks submit when the logo URL is not http(s)', () => {
    const onSubmit = vi.fn();
    render(<JobPostForm onSubmit={onSubmit} submitting={false} error="" submitLabel="Post job" />);
    fireEvent.change(screen.getByLabelText('Job title *'), { target: { value: 'Senior Dev' } });
    fireEvent.change(screen.getByLabelText('Company logo URL (optional)'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByText('Post job'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/http:\/\/ or https:\/\//i).length).toBeGreaterThan(0);
  });

  it('blocks submit when the description exceeds 10000 characters', () => {
    const onSubmit = vi.fn();
    render(<JobPostForm onSubmit={onSubmit} submitting={false} error="" submitLabel="Post job" />);
    fireEvent.change(screen.getByLabelText('Job title *'), { target: { value: 'Senior Dev' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'a'.repeat(10001) } });
    fireEvent.click(screen.getByText('Post job'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Description must not exceed 10000 characters/i).length).toBeGreaterThan(0);
  });

  it('blocks submit when the requirements exceed 5000 characters', () => {
    const onSubmit = vi.fn();
    render(<JobPostForm onSubmit={onSubmit} submitting={false} error="" submitLabel="Post job" />);
    fireEvent.change(screen.getByLabelText('Job title *'), { target: { value: 'Senior Dev' } });
    const requirementInputs = screen.getAllByLabelText(/Requirements/);
    fireEvent.change(requirementInputs[requirementInputs.length - 1], { target: { value: 'a'.repeat(5001) } });
    fireEvent.click(screen.getByText('Post job'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Requirements must not exceed 5000 characters/i).length).toBeGreaterThan(0);
  });

  it('submits a valid payload', () => {
    const onSubmit = vi.fn();
    render(<JobPostForm onSubmit={onSubmit} submitting={false} error="" submitLabel="Post job" />);
    fireEvent.change(screen.getByLabelText('Job title *'), { target: { value: 'Senior .NET Developer' } });
    fireEvent.click(screen.getByText('Post job'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Senior .NET Developer' }));
  });
});
