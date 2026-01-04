import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Setup localStorage mock for tests
const store: Record<string, string> = {};

const clearFn = () => {
  Object.keys(store).forEach((key) => delete store[key]);
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
if (process.env.NODE_OPTIONS && process.env.NODE_OPTIONS.includes('--localstorage-file')) {
  // Remove the flag if present
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS.replace(/--localstorage-file[=\s][^\s]*/g, '').trim();
}

// Cleanup after each test
afterEach(() => {
  cleanup();
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear();
  }
});
