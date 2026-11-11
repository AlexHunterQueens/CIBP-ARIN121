import { ChatMessage } from './types';

export async function sendChatRequest(
  messages: ChatMessage[],
  onStatusUpdate?: (statusMsg: string) => void,
  maxPerMinuteRetries = 4,
  timeoutMs = 90000
): Promise<string> {
  const startTime = Date.now();

  const executeAttempt = async (attemptNumber: number): Promise<string> => {
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeoutMs) {
      throw new Error('Request timed out after 90 seconds');
    }

    const remainingTimeout = Math.max(5000, timeoutMs - elapsed);
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), remainingTimeout);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-retry': 'true',
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      clearTimeout(timerId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const rawMsg = errorData.error || `Server returned error status ${response.status}`;

        // Check if daily quota reached - do not retry
        const isDaily =
          errorData.isDailyLimit ||
          /daily|per\s*day|per-day|day\s*quota|requests per day/i.test(rawMsg);

        if (isDaily) {
          throw new Error('Daily free limit reached. Your answers are saved. Try again tomorrow.');
        }

        // Check if per-minute 429 limit - wait 15 seconds and retry up to 4 times
        const isPerMinute =
          response.status === 429 ||
          errorData.isPerMinuteLimit ||
          /free tier limit|waiting a few seconds|resource_exhausted|rate/i.test(rawMsg);

        if (isPerMinute && attemptNumber < maxPerMinuteRetries) {
          onStatusUpdate?.('Free tier limit, waiting a few seconds...');
          await new Promise((resolve) => setTimeout(resolve, 15000));
          return executeAttempt(attemptNumber + 1);
        }

        throw new Error(rawMsg);
      }

      const data = await response.json();
      return data.text || '';
    } catch (err: any) {
      clearTimeout(timerId);
      if (err?.name === 'AbortError') {
        throw new Error('Request timed out after 90 seconds');
      }
      throw err;
    }
  };

  return executeAttempt(0);
}
