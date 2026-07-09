import { describe, expect, it } from 'vitest';
import { classifyNotificationError } from './notificationErrorClassifier.js';

describe('classifyNotificationError', () => {
  it('classifies rate limit retryable', () => {
    const out = classifyNotificationError(new Error('Notification webhook failed: 429 too many requests'));
    expect(out.code).toBe('RATE_LIMIT');
    expect(out.retryable).toBe(true);
  });

  it('classifies missing config non-retryable', () => {
    const out = classifyNotificationError(new Error('Missing VITE_NOTIFICATION_WEBHOOK_URL for webhook provider'));
    expect(out.code).toBe('MISSING_CONFIG');
    expect(out.retryable).toBe(false);
  });
});
