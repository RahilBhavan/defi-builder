import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Ensure jsdom environment is properly set up
// This should be handled by vitest's environment: 'jsdom' config,
// but we ensure document and window are available
if (typeof globalThis.document === 'undefined' || typeof globalThis.window === 'undefined') {
  // If running in a test environment without jsdom, we need to initialize it
  // This should not happen if vitest.config.ts has environment: 'jsdom'
  console.error(
    'Document or window not available. Ensure jsdom environment is configured in vitest.config.ts'
  );
}

// Setup localStorage mock for tests
const store: Record<string, string> = {};

const clearFn = () => {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
};

// Always set up localStorage mock to ensure consistency
// Suppress Node.js localStorage-file warning by ensuring proper setup
if (typeof global.localStorage === 'undefined' || typeof global.localStorage.clear !== 'function') {
  global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: clearFn,
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  } as Storage;
} else {
  // If localStorage exists but clear might not work, ensure it does
  const originalClear = global.localStorage.clear;
  if (!originalClear || typeof originalClear !== 'function') {
    global.localStorage.clear = clearFn;
  }
}

// Suppress Node.js localStorage-file warnings
// This warning comes from jsdom's use of Node's --localstorage-file flag
// We suppress it since we're using our own localStorage mock
if (process.env.NODE_OPTIONS?.includes('--localstorage-file')) {
  // Remove the flag if present
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS.replace(
    /--localstorage-file[=\s][^\s]*/g,
    ''
  ).trim();
}

// Mock window.location for WebSocket client
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'location', {
    value: {
      protocol: 'http:',
      hostname: 'localhost',
      href: 'http://localhost:3000',
    },
    writable: true,
    configurable: true,
  });
}

// Mock Notification API
class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn().mockResolvedValue('granted' as NotificationPermission);

  public onclick: ((this: Notification, ev: Event) => any) | null = null;
  public onclose: ((this: Notification, ev: Event) => any) | null = null;
  public onerror: ((this: Notification, ev: Event) => any) | null = null;
  public onshow: ((this: Notification, ev: Event) => any) | null = null;

  constructor(
    public title: string,
    public options?: NotificationOptions
  ) {
    // Auto-close after 5 seconds in tests
    setTimeout(() => {
      this.close();
    }, 5000);
  }

  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}

// Replace global Notification if not already defined
if (typeof global.Notification === 'undefined') {
  global.Notification = MockNotification as any;
  // Ensure static properties are available
  (global.Notification as any).permission = 'default';
  (global.Notification as any).requestPermission = MockNotification.requestPermission;
}

// Mock navigator.permissions if needed
if (typeof global.navigator !== 'undefined' && !global.navigator.permissions) {
  (global.navigator as any).permissions = {
    query: vi.fn().mockResolvedValue({ state: 'granted' }),
  };
}

// Mock WebSocket for tests that need it
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocol = '';
  extensions = '';
  binaryType: BinaryType = 'blob';

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();

  constructor(url: string, _protocols?: string | string[]) {
    this.url = url;
    // Simulate connection after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }
}

// Only replace WebSocket if not already defined (jsdom may provide it)
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = MockWebSocket as any;
}

// Ensure document and window are available (jsdom should provide these)
// If they're not available, we need to wait for jsdom to initialize
// This is a fallback - jsdom should be initialized by vitest before this runs
if (typeof global.document === 'undefined' || typeof global.window === 'undefined') {
  // Try to access them from the global scope
  // jsdom sets these up automatically when environment: 'jsdom' is configured
  // If they're still undefined, there's a configuration issue
  if (typeof globalThis.document === 'undefined' && typeof globalThis.window === 'undefined') {
    throw new Error(
      'jsdom environment not properly initialized. Ensure vitest.config.ts has environment: "jsdom"'
    );
  }
}

// Ensure sessionStorage is available
if (typeof global.sessionStorage === 'undefined') {
  global.sessionStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: clearFn,
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  } as Storage;
}

// Setup before each test
beforeEach(() => {
  // Reset WebSocket mock state if necessary
  if (global.WebSocket) {
    (global.WebSocket as any).readyState = 1; // OPEN
  }
  // Reset Notification permission
  if (global.Notification) {
    (global.Notification as any).permission = 'default';
  }
  // Clear localStorage and sessionStorage
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear();
  }
  if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.clear === 'function') {
    sessionStorage.clear();
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear();
  }
  if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.clear === 'function') {
    sessionStorage.clear();
  }
  // Reset Notification permission
  if (global.Notification) {
    (global.Notification as any).permission = 'default';
  }
  // Clear all mocks
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
