import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Mock Chrome APIs
Object.assign(global, {
  chrome: {
    runtime: {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      },
      getManifest: vi.fn(() => ({
        version: '1.0.0',
        name: 'ReplySage'
      }))
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn()
      }
    },
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn()
    },
    scripting: {
      executeScript: vi.fn()
    }
  }
})

// Mock WebCrypto API
Object.assign(global, {
  crypto: {
    subtle: {
      generateKey: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      deriveKey: vi.fn(),
      digest: vi.fn()
    },
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    })
  }
})

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(),
          get: vi.fn(),
          getAll: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn()
        }))
      }))
    }
  })),
  deleteDatabase: vi.fn()
}

Object.assign(global, {
  indexedDB: mockIndexedDB
})

// Mock performance API
Object.assign(global, {
  performance: {
    now: vi.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  }
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
