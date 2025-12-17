import { vi } from 'vitest'

// Define a dummy class for ResizeObserver
class ResizeObserver {
  observe() {
    // do nothing
  }
  unobserve() {
    // do nothing
  }
  disconnect() {
    // do nothing
  }
}

// Assign the dummy class to the global scope
global.ResizeObserver = ResizeObserver
