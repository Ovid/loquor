import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModelDownloadModal } from './ModelDownloadModal'

describe('ModelDownloadModal', () => {
  it('moves focus into the dialog on open and restores it on close', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const { rerender } = render(
      <ModelDownloadModal
        open
        progress={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    // Focus lands on the first action button, not the obscured trigger.
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /download/i }),
    )
    rerender(
      <ModelDownloadModal
        open={false}
        progress={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(document.activeElement).toBe(trigger) // restored on close
    trigger.remove()
  })

  it('Escape dismisses via onDecline when not downloading, onCancel while downloading', () => {
    const onDecline = vi.fn()
    const { rerender } = render(
      <ModelDownloadModal
        open
        progress={null}
        onAccept={vi.fn()}
        onDecline={onDecline}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onDecline).toHaveBeenCalled()

    const onCancel = vi.fn()
    rerender(
      <ModelDownloadModal
        open
        progress={{ loaded: 1, total: 2, text: 'shards' }}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('names the progress bar for assistive tech while downloading', () => {
    render(
      <ModelDownloadModal
        open
        progress={{ loaded: 1, total: 2, text: 'shards' }}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('progressbar', { name: 'Model download progress' }),
    ).toBeInTheDocument()
  })

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

  it('renders the estimated time remaining from the etaSeconds prop', () => {
    render(
      <ModelDownloadModal
        open
        progress={{ loaded: 50, total: 100, text: 'downloading' }}
        etaSeconds={10}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText(/~10s remaining/)).toBeInTheDocument()
  })

  it('omits the ETA while it is not yet estimable', () => {
    render(
      <ModelDownloadModal
        open
        progress={{ loaded: 0, total: 100, text: 'downloading' }}
        etaSeconds={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByText(/remaining/)).toBeNull()
  })

  it('discloses BOTH third-party hosts (S9: CLAUDE.md disclosure accuracy)', () => {
    // engine.webllm.ts fetches model weights from huggingface.co AND the
    // model-lib WASM from raw.githubusercontent.com; the modal must name both.
    render(
      <ModelDownloadModal
        open
        progress={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText(/Hugging Face/)).toBeInTheDocument()
    expect(screen.getByText(/GitHub/)).toBeInTheDocument()
  })

  it('exposes the dialog with an accessible name', () => {
    render(
      <ModelDownloadModal
        open
        progress={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('dialog', { name: /improve|upgrade/i }),
    ).toBeInTheDocument()
  })

  it('reframes as an upgrade and keeps grammar-only on "Not now"', () => {
    const onDecline = vi.fn()
    render(
      <ModelDownloadModal
        open
        progress={null}
        onAccept={() => {}}
        onDecline={onDecline}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByRole('heading')).toHaveTextContent(/improve|upgrade/i)
    fireEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(onDecline).toHaveBeenCalled()
  })

  it('shows the honest warning when warn is set (none device)', () => {
    render(
      <ModelDownloadModal
        open
        warn
        progress={null}
        onAccept={() => {}}
        onDecline={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByText(/may not support|may fail/i)).toBeInTheDocument()
  })

  it('omits the warning by default', () => {
    render(
      <ModelDownloadModal
        open
        progress={null}
        onAccept={() => {}}
        onDecline={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.queryByText(/may not support|may fail/i)).toBeNull()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <ModelDownloadModal
        open={false}
        progress={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('defaults to English when lang is omitted', () => {
    render(
      <ModelDownloadModal
        open
        progress={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading')).toHaveTextContent(
      /improve natural-language input/i,
    )
  })

  it('renders French copy when lang="fr"', () => {
    render(
      <ModelDownloadModal
        open
        lang="fr"
        warn
        progress={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading')).toHaveTextContent(/langage naturel/i)
    // warning paragraph (role="note") contains "mode simplifié"
    expect(screen.getByRole('note')).toHaveTextContent(/mode simplifié/i)
    expect(
      screen.getByRole('button', { name: /pas maintenant/i }),
    ).toBeInTheDocument()
  })

  it('renders German copy when lang="de"', () => {
    render(
      <ModelDownloadModal
        open
        lang="de"
        progress={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading')).toHaveTextContent(
      /natürlicher Sprache/i,
    )
    expect(
      screen.getByRole('button', { name: /nicht jetzt/i }),
    ).toBeInTheDocument()
  })

  it('renders Spanish copy when lang="es"', () => {
    render(
      <ModelDownloadModal
        open
        lang="es"
        progress={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading')).toHaveTextContent(/lenguaje natural/i)
    expect(
      screen.getByRole('button', { name: /ahora no/i }),
    ).toBeInTheDocument()
  })

  it('localizes the progress aria-label and cancel button while downloading', () => {
    render(
      <ModelDownloadModal
        open
        lang="fr"
        progress={{ loaded: 1, total: 2, text: 'x' }}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/téléchargement du modèle/i),
    ).toBeInTheDocument()
  })

  it('does not leak the English "downloading"/ETA into the FR modal (review I3/I4)', () => {
    render(
      <ModelDownloadModal
        open
        lang="fr"
        progress={{ loaded: 1, total: 2, text: 'downloading' }}
        etaSeconds={90}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByText(/downloading/i)).toBeNull()
    expect(screen.queryByText(/remaining/i)).toBeNull()
    expect(screen.getByText(/restantes/)).toBeInTheDocument() // localized ETA shown
  })
})
