import '@testing-library/jest-dom'

// RTL sets IS_REACT_ACT_ENVIRONMENT on window; React 18 reads it from globalThis.
// In Vitest jsdom the two are not the same object — set both.
// github.com/testing-library/react-testing-library/issues/1338
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).IS_REACT_ACT_ENVIRONMENT = true
}

// jsdom does not implement scrollIntoView — stub it globally so components that
// call el.scrollIntoView() (e.g. VocabularyDrawer) don't throw in tests.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = () => {}
}
