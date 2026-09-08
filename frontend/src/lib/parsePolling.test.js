import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pollForParsedSkills } from './parsePolling';

vi.mock('../api/client', () => ({
  api: { get: vi.fn() },
}));

import { api } from '../api/client';

describe('pollForParsedSkills', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('toasts once skills appear', async () => {
    vi.useFakeTimers();
    try {
      const showToast = vi.fn();
      api.get.mockResolvedValueOnce([]).mockResolvedValue([{ skillId: 1, name: 'React' }]);

      const done = pollForParsedSkills(showToast);
      await vi.advanceTimersByTimeAsync(3000);
      expect(showToast).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(3000);
      await done;

      expect(showToast).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith('Resume parsed: 1 skill ready — verify them in Assessments', 'success');
      expect(api.get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays silent when skills never appear', async () => {
    vi.useFakeTimers();
    try {
      const showToast = vi.fn();
      api.get.mockResolvedValue([]);

      const done = pollForParsedSkills(showToast);
      await vi.advanceTimersByTimeAsync(31000);
      await done;

      expect(showToast).not.toHaveBeenCalled();
      expect(api.get).toHaveBeenCalledTimes(10);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps polling through transient failures', async () => {
    vi.useFakeTimers();
    try {
      const showToast = vi.fn();
      api.get
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValue([{ skillId: 1, name: 'React' }]);

      const done = pollForParsedSkills(showToast);
      await vi.advanceTimersByTimeAsync(3000);
      expect(showToast).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(3000);
      await done;

      expect(showToast).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
