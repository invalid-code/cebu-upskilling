import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore, unreadCount } from './notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState()._reset();
  });

  it('pushes a notification with variant and timestamp', () => {
    useNotificationStore.getState().push('Hello', 'success');
    const { items } = useNotificationStore.getState();

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ message: 'Hello', variant: 'success', read: false });
    expect(items[0].id).toBeTruthy();
    expect(items[0].at).toBeGreaterThan(0);
  });

  it('defaults the variant to info', () => {
    useNotificationStore.getState().push('Heads up');
    expect(useNotificationStore.getState().items[0].variant).toBe('info');
  });

  it('moves a repeated message to the top instead of duplicating it', () => {
    const store = useNotificationStore.getState();
    store.push('First', 'info');
    store.push('Second', 'info');
    store.push('First', 'info');

    const { items } = useNotificationStore.getState();
    expect(items).toHaveLength(2);
    expect(items[0].message).toBe('First');
  });

  it('caps the feed at 30 items', () => {
    const store = useNotificationStore.getState();
    for (let i = 0; i < 40; i += 1) store.push(`msg ${i}`, 'info');

    expect(useNotificationStore.getState().items).toHaveLength(30);
    expect(useNotificationStore.getState().items[0].message).toBe('msg 39');
  });

  it('persists to localStorage and marks everything read', () => {
    useNotificationStore.getState().push('Saved', 'success');
    const raw = JSON.parse(localStorage.getItem('notifications'));
    expect(raw).toHaveLength(1);
    expect(raw[0].read).toBe(false);

    useNotificationStore.getState().markAllRead();
    expect(unreadCount(useNotificationStore.getState().items)).toBe(0);
    expect(JSON.parse(localStorage.getItem('notifications'))[0].read).toBe(true);
  });

  it('clears the feed and its storage key', () => {
    useNotificationStore.getState().push('Saved', 'success');
    useNotificationStore.getState().clear();
    expect(useNotificationStore.getState().items).toHaveLength(0);
    expect(localStorage.getItem('notifications')).toBe('[]');
  });
});
