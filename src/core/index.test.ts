import { describe, expect, it } from 'vitest'

describe('core placeholder', () => {
  it('loads without throwing', async () => {
    const mod = await import('./index')
    expect(mod).toBeDefined()
  })
})
