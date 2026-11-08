import { expect, test } from 'vitest'

test('unit project runs in jsdom', () => {
  expect(typeof document).toBe('object')
})
