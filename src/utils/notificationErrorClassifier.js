export function classifyNotificationError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('429')) return { code: 'RATE_LIMIT', retryable: true };
  if (message.includes('5')) return { code: 'PROVIDER_5XX', retryable: true };
  if (message.includes('missing vite_notification_webhook_url')) return { code: 'MISSING_CONFIG', retryable: false };
  if (message.includes('unsupported notification provider')) return { code: 'UNSUPPORTED_PROVIDER', retryable: false };
  if (message.includes('missing notification channel')) return { code: 'MISSING_CHANNEL', retryable: false };
  return { code: 'UNKNOWN', retryable: Boolean(error?.isRetryable) };
}
