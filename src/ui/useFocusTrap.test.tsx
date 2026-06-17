import { render } from '@testing-library/react'
import { StrictMode, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFocusTrap } from './useFocusTrap'

// The trap lives in a component that mounts/unmounts with the modal — the same
// shape as the real overlay — so StrictMode double-invokes its open effect.
function Dialog({ onEscape }: { onEscape: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, { active: true, onEscape })
  return (
    <div role="dialog" ref={ref}>
      <button data-testid="inside">inside</button>
    </div>
  )
}

function Host({ open, onEscape }: { open: boolean; onEscape: () => void }) {
  return (
    <>
      <button data-testid="trigger">trigger</button>
      {open && <Dialog onEscape={onEscape} />}
    </>
  )
}

describe('useFocusTrap', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('moves focus into the container on open', () => {
    const { getByTestId, rerender } = render(
      <Host open={false} onEscape={() => {}} />,
    )
    getByTestId('trigger').focus()
    rerender(<Host open={true} onEscape={() => {}} />)
    expect(document.activeElement).toBe(getByTestId('inside'))
  })

  it('restores focus to the trigger even when the first focus() is swallowed (inert ancestor, M9)', () => {
    // A real browser makes the trigger's ancestor `inert` while the modal is
    // open (M9). On close the trap restores focus before `inert` clears, so the
    // synchronous focus() is a no-op and focus falls to <body>. jsdom doesn't
    // enforce inert, so we simulate it: the first focus() after close does
    // nothing; a later one (after inert clears) works. The trap must retry on
    // the next frame instead of giving up.
    const raf = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0)
        return 0
      })
    const { getByTestId, rerender } = render(
      <Host open={false} onEscape={() => {}} />,
    )
    const trigger = getByTestId('trigger')
    trigger.focus()
    rerender(<Host open={true} onEscape={() => {}} />)
    expect(document.activeElement).toBe(getByTestId('inside'))

    const realFocus = HTMLElement.prototype.focus
    let calls = 0
    vi.spyOn(trigger, 'focus').mockImplementation(() => {
      calls += 1
      if (calls === 1) return // inert: the first restore attempt is swallowed
      realFocus.call(trigger)
    })

    rerender(<Host open={false} onEscape={() => {}} />)

    expect(document.activeElement).toBe(trigger)
    raf.mockRestore()
  })

  it('restores focus to the opener, not a control inside the dialog, under StrictMode + inert', () => {
    // StrictMode double-invokes the open effect. If the trigger is inert while
    // the dialog is open (M9), the first cleanup's restore is swallowed, so the
    // second effect run must NOT capture the now-focused in-dialog control as
    // the restore target — it must keep the original opener.
    const { getByTestId, rerender } = render(
      <StrictMode>
        <Host open={false} onEscape={() => {}} />
      </StrictMode>,
    )
    const trigger = getByTestId('trigger')
    trigger.focus()

    // Model the trigger's inert ancestor: focusing it is a no-op while the
    // dialog is mounted, and works once the dialog is gone.
    const realFocus = HTMLElement.prototype.focus
    vi.spyOn(trigger, 'focus').mockImplementation(() => {
      if (document.querySelector('[role="dialog"]')) return
      realFocus.call(trigger)
    })

    rerender(
      <StrictMode>
        <Host open={true} onEscape={() => {}} />
      </StrictMode>,
    )
    rerender(
      <StrictMode>
        <Host open={false} onEscape={() => {}} />
      </StrictMode>,
    )

    expect(document.activeElement).toBe(trigger)
  })
})
