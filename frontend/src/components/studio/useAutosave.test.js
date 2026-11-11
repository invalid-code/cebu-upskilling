import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useAutosave from './useAutosave';

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('goes Saving -> Saved after an edit', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { result, rerender } = renderHook(({ value }) => useAutosave({ value, enabled: true, save }), {
      initialProps: { value: 'a' },
    });
    expect(result.current.status).toBe('idle');
    rerender({ value: 'b' });
    expect(result.current.dirty).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(save).toHaveBeenCalledWith('b');
    expect(result.current.status).toBe('saved');
    expect(result.current.dirty).toBe(false);
  });

  it('reports Save failed, retries 3 times at 5s intervals, then stops', async () => {
    const save = vi.fn().mockRejectedValue(new Error('boom'));
    const { result, rerender } = renderHook(({ value }) => useAutosave({ value, enabled: true, save }), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('failed');
    expect(result.current.dirty).toBe(true);

    await act(async () => { await vi.advanceTimersByTimeAsync(4999); });
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(save).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(save).toHaveBeenCalledTimes(4); // 1 attempt + 3 retries
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(save).toHaveBeenCalledTimes(4);
    expect(result.current.status).toBe('failed');
    expect(result.current.dirty).toBe(true);
  });

  it('recovers to Saved when a retry succeeds', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue({});
    const { result, rerender } = renderHook(({ value }) => useAutosave({ value, enabled: true, save }), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(result.current.status).toBe('failed');
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(result.current.status).toBe('saved');
  });
});
