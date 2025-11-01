/**
 * Advanced User Analytics Tracker
 * Tracks user interactions, behavior, and engagement metrics
 * Integrates with Google Analytics 4 and custom backend
 */

interface AnalyticsEvent {
  event_name: string;
  event_category: string;
  event_value?: number;
  event_label?: string;
  user_id?: string;
  session_id: string;
  timestamp: number;
  url: string;
  user_agent: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  device_info?: {
    type: 'mobile' | 'tablet' | 'desktop';
    browser: string;
    os: string;
  };
  custom_properties?: Record<string, any>;
}

interface UserSession {
  session_id: string;
  user_id?: string;
  start_time: number;
  last_activity: number;
  page_views: number;
  events: AnalyticsEvent[];
  device_type: string;
  browser: string;
  os: string;
}

interface AnalyticsMetrics {
  total_sessions: number;
  total_users: number;
  avg_session_duration: number;
  bounce_rate: number;
  conversion_rate: number;
  pages_per_session: number;
  top_pages: Array<{ page: string; views: number }>;
  top_events: Array<{ event: string; count: number }>;
}

class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private events: AnalyticsEvent[] = [];
  private session: UserSession;
  private isEnabled: boolean = true;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  private batchTimer?: NodeJS.Timeout;

  private constructor() {
    this.session = this.createSession();
    this.startAutoFlush();
    this.trackPageLoad();
    this.setupEventListeners();
  }

  static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  private createSession(): UserSession {
    const deviceInfo = this.getDeviceInfo();
    return {
      session_id: this.generateSessionId(),
      start_time: Date.now(),
      last_activity: Date.now(),
      page_views: 0,
      events: [],
      device_type: deviceInfo.type,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device type
    if (/mobile|android|iphone|ipod/i.test(ua)) deviceType = 'mobile';
    if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    // Detect browser
    if (/Chrome/.test(ua)) browser = 'Chrome';
    else if (/Safari/.test(ua)) browser = 'Safari';
    else if (/Firefox/.test(ua)) browser = 'Firefox';
    else if (/Edge/.test(ua)) browser = 'Edge';

    // Detect OS
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iOS|iPhone|iPad/.test(ua)) os = 'iOS';

    return { type: deviceType, browser, os };
  }

  trackEvent(
    eventName: string,
    eventCategory: string,
    eventValue?: number,
    eventLabel?: string,
    customProperties?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      event_name: eventName,
      event_category: eventCategory,
      event_value,
      event_label,
      session_id: this.session.session_id,
      timestamp: Date.now(),
      url: window.location.href,
      user_agent: navigator.userAgent,
      device_info: {
        type: this.session.device_type as 'mobile' | 'tablet' | 'desktop',
        browser: this.session.browser,
        os: this.session.os,
      },
      custom_properties: customProperties,
    };

    this.events.push(event);
    this.session.events.push(event);
    this.session.last_activity = Date.now();

    // Auto-flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flush();
    }

    // Send to Google Analytics 4
    if (window.gtag) {
      window.gtag('event', eventName, {
        event_category: eventCategory,
        event_value: eventValue,
        event_label: eventLabel,
        ...customProperties,
      });
    }
  }

  trackPageView(pageName?: string, pageTitle?: string): void {
    if (!this.isEnabled) return;

    this.session.page_views++;

    this.trackEvent('page_view', 'engagement', undefined, pageName || window.location.pathname);

    // Send to Google Analytics 4
    if (window.gtag) {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: window.location.pathname,
        page_title: pageTitle || document.title,
      });
    }
  }

  trackConversion(conversionName: string, conversionValue?: number): void {
    if (!this.isEnabled) return;

    this.trackEvent('conversion', 'purchase', conversionValue, conversionName, {
      conversion_type: conversionName,
      conversion_value: conversionValue || 1,
    });

    // Send to Google Analytics 4
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: this.generateSessionId(),
        value: conversionValue || 1,
        currency: 'USD',
      });
    }
  }

  trackError(errorMessage: string, errorType?: string, stackTrace?: string): void {
    if (!this.isEnabled) return;

    this.trackEvent('error', 'exception', undefined, errorMessage, {
      error_type: errorType || 'unknown',
      stack_trace: stackTrace,
    });

    // Send to Google Analytics 4
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: errorMessage,
        fatal: false,
      });
    }
  }

  trackTiming(timingName: string, timingValue: number, timingCategory: string): void {
    if (!this.isEnabled) return;

    this.trackEvent(timingName, timingCategory, timingValue, 'timing', {
      timing_value: timingValue,
      timing_label: timingName,
    });

    // Send to Google Analytics 4
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: timingName,
        value: timingValue,
        event_category: timingCategory,
      });
    }
  }

  private trackPageLoad(): void {
    this.trackPageView();

    // Track page load time
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        const loadTime = (perfData as PerformanceNavigationTiming).loadEventEnd -
          (perfData as PerformanceNavigationTiming).loadEventStart;
        this.trackTiming('page_load', loadTime, 'performance');
      }
    });
  }

  private setupEventListeners(): void {
    // Track clicks
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.id || target.className) {
        this.trackEvent(
          'click',
          'interaction',
          undefined,
          target.id || target.className
        );
      }
    });

    // Track form submissions
    document.addEventListener('submit', (e: Event) => {
      const form = e.target as HTMLFormElement;
      this.trackEvent('form_submit', 'engagement', undefined, form.name || form.id);
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent(
        'page_visibility',
        'engagement',
        undefined,
        document.hidden ? 'hidden' : 'visible'
      );
    });
  }

  private startAutoFlush(): void {
    this.batchTimer = setInterval(() => {
      if (this.events.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.session.session_id,
          events: eventsToFlush,
        }),
      });
    } catch (error) {
      console.error('Failed to flush analytics:', error);
      // Re-add events to queue for retry
      this.events.unshift(...eventsToFlush);
    }
  }

  setUserId(userId: string): void {
    this.session.user_id = userId;
    this.events.forEach(event => {
      event.user_id = userId;
    });
  }

  disable(): void {
    this.isEnabled = false;
    this.flush();
  }

  enable(): void {
    this.isEnabled = true;
  }

  getSessionId(): string {
    return this.session.session_id;
  }

  getMetrics(): AnalyticsMetrics {
    const uniquePages = new Set(this.session.events.map(e => e.url));
    const eventCounts: Record<string, number> = {};

    this.session.events.forEach(event => {
      eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
    });

    const sessionDuration = (this.session.last_activity - this.session.start_time) / 1000;

    return {
      total_sessions: 1,
      total_users: this.session.user_id ? 1 : 0,
      avg_session_duration: sessionDuration,
      bounce_rate: this.session.events.length === 1 ? 100 : 0,
      conversion_rate: 0,
      pages_per_session: uniquePages.size,
      top_pages: Array.from(uniquePages).map(page => ({ page, views: 1 })),
      top_events: Object.entries(eventCounts).map(([event, count]) => ({
        event,
        count,
      })),
    };
  }
}

export default AnalyticsTracker;
export type { AnalyticsEvent, UserSession, AnalyticsMetrics };