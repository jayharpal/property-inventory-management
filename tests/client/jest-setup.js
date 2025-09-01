// jest-setup.js
import '@testing-library/jest-dom';

// Mock fetch if it doesn't exist
if (!global.fetch) {
  global.fetch = jest.fn().mockImplementation(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  );
}

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Set test environment timezone
process.env.TZ = 'UTC';

// Mock document.createRange for components that use it
if (typeof document.createRange !== 'function') {
  document.createRange = () => ({
    setStart: () => {},
    setEnd: () => {},
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document,
    },
    createContextualFragment: str => {
      const temp = document.createElement('template');
      temp.innerHTML = str;
      return temp.content;
    },
  });
}

// Suppress console errors and warnings during testing
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  if (args[0] && args[0].includes && (
    args[0].includes('Not implemented') ||
    args[0].includes('React does not recognize the') ||
    args[0].includes('Warning:')
  )) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (args[0] && args[0].includes && (
    args[0].includes('Warning:') ||
    args[0].includes('is deprecated')
  )) {
    return;
  }
  originalConsoleWarn(...args);
};