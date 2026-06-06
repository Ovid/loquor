import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { SkeletonTerminal } from './SkeletonTerminal'

beforeEach(() => {
  const bytes = readFileSync('public/games/zork1.z3')
  vi.stubGlobal('fetch', vi.fn(async () => ({
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  })))
})

describe('SkeletonTerminal', () => {
  it('boots Zork I and renders the opening room', async () => {
    render(<SkeletonTerminal />)
    await waitFor(
      () => {
        const pre = document.querySelector('pre')
        expect(pre?.textContent ?? '').toMatch(/West of House/)
      },
      { timeout: 5000 },
    )
  })
})
