export const notificationSenderService = {
  validateConfig() {
    const mode = (import.meta.env.VITE_NOTIFICATION_PROVIDER || 'stub').toLowerCase();
    if (mode === 'webhook' && !import.meta.env.VITE_NOTIFICATION_WEBHOOK_URL) {
      throw new Error('Missing VITE_NOTIFICATION_WEBHOOK_URL for webhook provider');
    }
    return { mode };
  },

  async send({ channel, subject, payload }) {
    if (!channel) throw new Error('Missing notification channel');

    const { mode } = this.validateConfig();

    if (mode === 'stub') {
      return {
        ok: true,
        channel,
        subject,
        payload,
        provider_message_id: `stub-${Date.now()}`,
      };
    }

    if (mode === 'webhook') {
      const webhookUrl = import.meta.env.VITE_NOTIFICATION_WEBHOOK_URL;
      if (!webhookUrl) throw new Error('Missing VITE_NOTIFICATION_WEBHOOK_URL');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(import.meta.env.VITE_NOTIFICATION_WEBHOOK_KEY ? { 'x-api-key': import.meta.env.VITE_NOTIFICATION_WEBHOOK_KEY } : {}),
        },
        body: JSON.stringify({ channel, subject, payload }),
      });

      if (!response.ok) {
        const text = await response.text();
        const temporary = response.status >= 500 || response.status === 429;
        const error = new Error(`Notification webhook failed: ${response.status} ${text}`);
        error.isRetryable = temporary;
        throw error;
      }

      const body = await response.json().catch(() => ({}));
      return {
        ok: true,
        channel,
        subject,
        payload,
        provider_message_id: body.id || body.message_id || `webhook-${Date.now()}`,
      };
    }

    throw new Error(`Unsupported notification provider: ${mode}`);
  },
};
