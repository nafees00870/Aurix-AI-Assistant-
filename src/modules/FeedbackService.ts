/**
 * FeedbackService module
 * Manages storing, submitting, and analyzing thumbs up/down ratings
 * and text feedback associated with Aurix conversation turns.
 */

import { ResponseFeedback, FeedbackRating, FeedbackCategory } from './AurixState';

const LOCAL_STORAGE_KEY = 'aurix_conversation_feedback_v1';

export interface FeedbackSummary {
  total: number;
  thumbsUp: number;
  thumbsDown: number;
  satisfactionRate: number; // 0 to 100 percentage
}

class FeedbackService {
  private feedbacks: Map<string, ResponseFeedback> = new Map();
  private listeners: Set<(feedbacks: ResponseFeedback[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.loadFromBackend().catch(() => {});
  }

  public async loadFromBackend(): Promise<void> {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        if (data.feedbacks && Array.isArray(data.feedbacks)) {
          for (const item of data.feedbacks) {
            this.feedbacks.set(item.turnId, item);
          }
          this.persist();
        }
      }
    } catch (err) {
      // offline or startup notice
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed: ResponseFeedback[] = JSON.parse(raw);
        for (const item of parsed) {
          this.feedbacks.set(item.turnId, item);
        }
      }
    } catch (e) {
      console.warn('[FeedbackService] Failed to load local feedback storage:', e);
    }
  }

  private persist(): void {
    try {
      const arr = Array.from(this.feedbacks.values());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(arr));
      this.notifyListeners();
    } catch (e) {
      console.warn('[FeedbackService] Failed to persist feedback to localStorage:', e);
    }
  }

  private notifyListeners(): void {
    const list = this.getAllFeedback();
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch (e) {
        console.error(e);
      }
    });
  }

  public subscribe(listener: (feedbacks: ResponseFeedback[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllFeedback());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getAllFeedback(): ResponseFeedback[] {
    return Array.from(this.feedbacks.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getFeedbackForTurn(turnId: string): ResponseFeedback | undefined {
    return this.feedbacks.get(turnId);
  }

  public getSummary(): FeedbackSummary {
    const list = this.getAllFeedback();
    const total = list.length;
    if (total === 0) {
      return { total: 0, thumbsUp: 0, thumbsDown: 0, satisfactionRate: 100 };
    }
    const thumbsUp = list.filter((f) => f.rating === 'thumbs_up').length;
    const thumbsDown = list.filter((f) => f.rating === 'thumbs_down').length;
    const satisfactionRate = Math.round((thumbsUp / total) * 100);

    return {
      total,
      thumbsUp,
      thumbsDown,
      satisfactionRate,
    };
  }

  public async submitFeedback(params: {
    turnId: string;
    rating: FeedbackRating;
    aurixResponse: string;
    userPrompt?: string;
    textFeedback?: string;
    category?: FeedbackCategory;
  }): Promise<ResponseFeedback> {
    const existing = this.feedbacks.get(params.turnId);
    const feedback: ResponseFeedback = {
      id: existing?.id || `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      turnId: params.turnId,
      rating: params.rating,
      userPrompt: params.userPrompt || existing?.userPrompt,
      aurixResponse: params.aurixResponse,
      textFeedback: params.textFeedback?.trim() || existing?.textFeedback || undefined,
      category: params.category || existing?.category,
      timestamp: new Date().toISOString(),
    };

    this.feedbacks.set(params.turnId, feedback);
    this.persist();

    // Asynchronously sync to backend endpoint for aggregation & analytics
    this.syncToBackend(feedback).catch((err) => {
      console.warn('[FeedbackService] Sync to backend notice:', err);
    });

    return feedback;
  }

  public async removeFeedback(turnId: string): Promise<void> {
    if (this.feedbacks.has(turnId)) {
      this.feedbacks.delete(turnId);
      this.persist();
      try {
        await fetch(`/api/feedback/${turnId}`, { method: 'DELETE' });
      } catch (e) {
        // ignore network error on delete
      }
    }
  }

  public async clearAllFeedback(): Promise<void> {
    this.feedbacks.clear();
    this.persist();
    try {
      await fetch('/api/feedback', { method: 'DELETE' });
    } catch (e) {
      // ignore
    }
  }

  private async syncToBackend(feedback: ResponseFeedback): Promise<void> {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });
    } catch (err) {
      console.warn('[FeedbackService] Could not send feedback to /api/feedback:', err);
    }
  }
}

export const feedbackService = new FeedbackService();
