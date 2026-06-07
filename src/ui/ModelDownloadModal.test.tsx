import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModelDownloadModal } from './ModelDownloadModal'

describe('ModelDownloadModal', () => {
  it('accept and decline fire when not downloading', () => {
    const onAccept = vi.fn()
    const onDecline = vi.fn()
    render(
      <ModelDownloadModal
        open
        progress={null}
        onAccept={onAccept}
        onDecline={onDecline}
        onCancel={vi.fn()}
      />,
    )
    screen.getByRole('button', { name: /accept|download/i }).click()
    screen.getByRole('button', { name: /decline|not now/i }).click()
    expect(onAccept).toHaveBeenCalled()
    expect(onDecline).toHaveBeenCalled()
  })

  it('shows progress and a cancel while downloading', () => {
    const onCancel = vi.fn()
    render(
      <ModelDownloadModal
        open
        progress={{ loaded: 1, total: 2, text: 'shards' }}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={onCancel}
      />,
    )
    expect(screen.getByText(/50%/)).toBeInTheDocument()
    screen.getByRole('button', { name: /cancel/i }).click()
    expect(onCancel).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <ModelDownloadModal open={false} progress={null} onAccept={vi.fn()} onDecline={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
