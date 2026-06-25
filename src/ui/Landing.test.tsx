import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Landing } from './Landing'
import { LANDING_EXAMPLES, LANDING_EXAMPLES_KA_INPUT } from './landingExamples'
import { LANDING_STRINGS, KA_INPUT_COPY } from './landingStrings'
import { LS_KEYS } from '../storageKeys'
import { FOCUSABLE } from './useFocusTrap'

describe('Landing', () => {
  afterEach(() => localStorage.clear())

  it('lets you pick a volume and enter', () => {
    const onEnter = vi.fn()
    render(
      <Landing onEnter={onEnter} savedSlugs={new Set()} themeToggle={null} />,
    )
    fireEvent.click(screen.getByText(LANDING_STRINGS.en.subtitles.zork2))
    fireEvent.click(screen.getByRole('button', { name: /Light the lamp/i }))
    expect(onEnter).toHaveBeenCalledWith('zork2')
  })
  it('marks the localized plate translate="no" so Chrome cannot rewrite the chosen language to English', () => {
    const { container } = render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(container.querySelector('.plate')).toHaveAttribute('translate', 'no')
  })
  it('exposes the volumes as a named radiogroup with arrow-key selection (M2)', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    const group = screen.getByRole('radiogroup', {
      name: /choose your descent/i,
    })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(3)
    // Zork I is selected by default.
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('tabindex', '0')
    expect(radios[1]).toHaveAttribute('tabindex', '-1')
    // ArrowRight moves the checked state to the next volume.
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(within(group).getAllByRole('radio')[1]).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('gives each volume radio a localized accessible name (numeral + subtitle) (S3)', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'de', declined: false }),
    )
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    // The radio's accessible name is its numeral + the localized subtitle, so a
    // screen-reader user hears "I Das große unterirdische Reich", not a bare "I".
    expect(
      screen.getByRole('radio', {
        name: new RegExp(`I.*${LANDING_STRINGS.de.subtitles.zork1}`),
      }),
    ).toBeInTheDocument()
  })

  it('renders the initial landing inside a main landmark (m1)', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  // Phase-2 Georgian-input split (§5.6): the landing tracks `kaInputActive`, so
  // Georgian-input copy/examples show for Zork I but Zork II/III stay Phase-1
  // type-English (no misleading invite where input would always abstain).
  describe('Georgian Phase-2 input split (§5.6)', () => {
    const setKa = () =>
      localStorage.setItem(
        LS_KEYS.nlPref,
        JSON.stringify({ language: 'ka', declined: false }),
      )
    const examplesRegion = () =>
      screen.getByRole('region', {
        name: LANDING_STRINGS.ka.commandExamples,
      })

    it('Zork I (default) invites Georgian input + shows Georgian examples voiced as ka', () => {
      setKa()
      const { container } = render(
        <Landing
          onEnter={() => {}}
          savedSlugs={new Set()}
          themeToggle={null}
        />,
      )
      // Phase-2 how-to ("type in Georgian"), not the Phase-1 "type in English".
      const howto = container.querySelector('.howto')?.textContent ?? ''
      expect(howto).toContain('აკრიფეთ ქართულად') // type in Georgian
      expect(howto).not.toContain('ინგლისურად აკრიფეთ') // not the Phase-1 line
      // Georgian command examples, voiced as Georgian (no lang="en" override).
      const region = examplesRegion()
      expect(region).toHaveTextContent(LANDING_EXAMPLES_KA_INPUT.join(' · '))
      expect(region).not.toHaveAttribute('lang', 'en')
    })

    it('Zork II keeps the Phase-1 type-English copy + English examples voiced as en', () => {
      setKa()
      const { container } = render(
        <Landing
          onEnter={() => {}}
          savedSlugs={new Set()}
          themeToggle={null}
        />,
      )
      fireEvent.click(screen.getByText(LANDING_STRINGS.ka.subtitles.zork2))
      const howto = container.querySelector('.howto')?.textContent ?? ''
      expect(howto).toContain('ინგლისურად აკრიფეთ') // Phase-1 "type in English"
      expect(howto).not.toContain(KA_INPUT_COPY.howToBody)
      // English examples under the lang="ka" plate get the lang="en" override.
      const region = examplesRegion()
      expect(region).toHaveTextContent(LANDING_EXAMPLES.ka.join(' · '))
      expect(region).toHaveAttribute('lang', 'en')
    })
  })

  it('shows a resume hint for saved games', () => {
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set(['zork1'])}
        themeToggle={null}
      />,
    )
    expect(screen.getByText(/resume/i)).toBeInTheDocument()
  })

  // Overlay (story-picker) mode: when opened over a running game, the picker
  // must be dismissible so the player can return to where they were.
  it('renders no dismiss control on the initial landing (no onDismiss)', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(screen.queryByRole('button', { name: /return to game/i })).toBeNull()
  })
  it('calls onDismiss when the dismiss control is clicked (overlay mode)', () => {
    const onDismiss = vi.fn()
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set()}
        themeToggle={null}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /return to game/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
  it('dismisses on the Escape key (overlay mode)', () => {
    const onDismiss = vi.fn()
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set()}
        themeToggle={null}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
  it('exposes a language combobox defaulting to the saved pref', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'fr', declined: false }),
    )
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    // When saved pref is French, the plate localizes and the combobox aria-label
    // is "Langue" (the French visible label, colon stripped).
    expect(screen.getByRole('combobox', { name: /langue/i })).toHaveTextContent(
      'Français',
    )
  })

  it('defaults to English and does not offer Off on the title screen', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    const btn = screen.getByRole('combobox', { name: /language/i })
    expect(btn).toHaveTextContent('English')
    fireEvent.click(btn)
    expect(screen.queryByRole('option', { name: 'Off' })).toBeNull()
    // en, fr, de, es, ka — every play language except Off.
    expect(screen.getAllByRole('option')).toHaveLength(5)
  })

  it('maps a saved Off preference to English on the title screen', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'off', declined: false }),
    )
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(
      screen.getByRole('combobox', { name: /language/i }),
    ).toHaveTextContent('English')
  })

  it('persists the chosen language when entering the game', () => {
    const onEnter = vi.fn()
    render(
      <Landing onEnter={onEnter} savedSlugs={new Set()} themeToggle={null} />,
    )
    fireEvent.click(screen.getByRole('combobox', { name: /language/i }))
    fireEvent.click(screen.getByRole('option', { name: 'Deutsch' }))
    // After picking Deutsch the enter button shows the German label.
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(LANDING_STRINGS.de.enter.replace(/\s*→\s*$/, '')),
      }),
    )
    expect(onEnter).toHaveBeenCalledWith('zork1')
    expect(JSON.parse(localStorage.getItem(LS_KEYS.nlPref)!).language).toBe(
      'de',
    )
  })

  it('preserves a saved Off across landing→enter when the picker is untouched (I1)', () => {
    // An in-game "Off" (NL disabled) must survive a landing round-trip — a plain
    // reload or "Change story" must not silently re-enable the layer.
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'off', declined: false }),
    )
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Light the lamp/i }))
    expect(JSON.parse(localStorage.getItem(LS_KEYS.nlPref)!).language).toBe(
      'off',
    )
  })

  it('onboards a brand-new player into the shown language on enter (no stored pref)', () => {
    // No stored pref: the picker shows English and the pitch says "type in plain
    // language", so entering must persist English (not the DEFAULT off).
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Light the lamp/i }))
    expect(JSON.parse(localStorage.getItem(LS_KEYS.nlPref)!).language).toBe(
      'en',
    )
  })

  it('lets an Off player opt back in by choosing a language on the landing', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'off', declined: false }),
    )
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    fireEvent.click(screen.getByRole('combobox', { name: /language/i }))
    fireEvent.click(screen.getByRole('option', { name: 'Deutsch' }))
    // After picking Deutsch the enter button shows the German label.
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(LANDING_STRINGS.de.enter.replace(/\s*→\s*$/, '')),
      }),
    )
    expect(JSON.parse(localStorage.getItem(LS_KEYS.nlPref)!).language).toBe(
      'de',
    )
  })

  it('keeps the language picker operable in the Change story overlay variant', () => {
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set()}
        themeToggle={null}
        onDismiss={() => {}}
      />,
    )
    const btn = screen.getByRole('combobox', { name: /language/i })
    fireEvent.click(btn)
    fireEvent.click(screen.getByRole('option', { name: 'Español' }))
    expect(btn).toHaveTextContent('Español')
  })

  it('shows plain-language how-to copy, not the old canonical-command framing', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(
      screen.getByText(/Type what you want to do in plain language/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/the way the game expects it/i),
    ).not.toBeInTheDocument()
  })

  it('shows English examples by default and localizes them on selection', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    const region = screen.getByRole('region', { name: /examples/i })
    expect(region).toHaveTextContent(LANDING_EXAMPLES.en.join(' · '))
    fireEvent.click(screen.getByRole('combobox', { name: /language/i }))
    fireEvent.click(screen.getByRole('option', { name: 'Français' }))
    expect(region).toHaveTextContent(LANDING_EXAMPLES.fr.join(' · '))
  })

  it('announces example changes politely (aria-live)', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(screen.getByRole('region', { name: /examples/i })).toHaveAttribute(
      'aria-live',
      'polite',
    )
  })

  it('shows the basic-now / optional-model caveat under the picker', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(screen.getByText(/Basic commands work now/i)).toBeInTheDocument()
    expect(
      screen.getByText(/optional, experimental model/i),
    ).toBeInTheDocument()
  })

  it('shows the Zork trademark / open-source footnote', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    // The footnote <footer> maps to a contentinfo landmark (its nearest sectioning
    // ancestor is <main>), but the overlay variant renders a <div> root instead —
    // so query by text/role, which is stable across both Landing variants.
    expect(screen.getByText(/trademark of Activision/i)).toBeInTheDocument()
    // The "code was released" sentence links to Microsoft's open-source announcement.
    const blog = screen.getByRole('link', {
      name: /released by Microsoft under the MIT License/i,
    })
    expect(blog).toHaveAttribute(
      'href',
      'https://opensource.microsoft.com/blog/2025/11/20/preserving-code-that-shaped-generations-zork-i-ii-and-iii-go-open-source/',
    )
    expect(blog).toHaveAttribute('rel', expect.stringContaining('noopener'))
    const repo = screen.getByRole('link', { name: /View on GitHub/i })
    expect(repo).toHaveAttribute('href', 'https://github.com/Ovid/loquor')
    expect(repo).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('traps Tab within the plate so focus cannot reach the game behind it', () => {
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set()}
        themeToggle={null}
        onDismiss={() => {}}
      />,
    )
    // Gather focusables exactly as the trap does (buttons AND the repo link),
    // so the list's "last" matches the trap's real last element.
    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>(FOCUSABLE),
    )
    const last = focusables[focusables.length - 1]
    last.focus()
    expect(document.activeElement).toBe(last)
    // Tab from the last control wraps back to the first (the dismiss button),
    // rather than escaping into the dimmed game.
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(focusables[0])
  })

  it('renders localized copy and volume subtitle for the stored language (de)', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'de', declined: false }),
    )
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    const de = LANDING_STRINGS.de
    expect(screen.getByText(de.howToBody)).toBeInTheDocument()
    // The primary action is found by its localized accessible name.
    expect(
      screen.getByRole('button', {
        name: new RegExp(de.enter.replace(/\s*→\s*$/, '')),
      }),
    ).toBeInTheDocument()
    // The volume subtitle is localized, not the English catalog value.
    expect(screen.getByText(de.subtitles.zork1)).toBeInTheDocument()
    expect(
      screen.queryByText('The Great Underground Empire'),
    ).not.toBeInTheDocument()
  })

  it('localizes the radiogroup label for the stored language (es)', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'es', declined: false }),
    )
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(
      screen.getByRole('radiogroup', { name: /elige tu descenso/i }),
    ).toBeInTheDocument()
  })

  it('localizes the command-examples region accessible name (de)', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'de', declined: false }),
    )
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    // The examples element has role="region"; assert its accessible name is the
    // localized label and not the former English hardcode.
    const de = LANDING_STRINGS.de
    expect(
      screen.getByRole('region', { name: de.commandExamples }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Command examples' }),
    ).not.toBeInTheDocument()
  })

  it('marks the localized plate with a lang attribute and keeps the tagline English', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'fr', declined: false }),
    )
    const { container } = render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(container.querySelector('.plate')).toHaveAttribute('lang', 'fr')
    expect(container.querySelector('.tagline')).toHaveAttribute('lang', 'en')
    // The Loquor wordmark is the English brand, not French — so a French screen
    // reader doesn't mispronounce it (S1).
    expect(container.querySelector('.title')).toHaveAttribute('lang', 'en')
  })

  it('badges untranslated volumes only when a translation language is selected', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    // Default language English (the source) → no volume is badged.
    expect(
      screen.getByRole('radio', { name: /Wizard|Frobozz/i }).textContent,
    ).not.toMatch(/anglais|English only|ინგლისურად|nur Englisch|inglés/i)
    // Switch to French: Zork I has an fr corpus; Zork II/III do not.
    fireEvent.click(screen.getByRole('combobox', { name: /language/i }))
    fireEvent.click(screen.getByRole('option', { name: 'Français' }))
    // Zork I IS translated → no badge.
    expect(
      screen.getByRole('radio', { name: /Empire Souterrain/i }).textContent,
    ).not.toMatch(/anglais/i)
    // Zork II is NOT translated → badge, and it's part of the accessible name.
    expect(screen.getByRole('radio', { name: /Frobozz/i }).textContent).toMatch(
      /en anglais/i,
    )
    // The badge is part of the radio's accessible name (joins numeral+subtitle).
    expect(
      screen.getByRole('radio', {
        name: /Frobozz.*en anglais|en anglais.*Frobozz/i,
      }),
    ).toBeInTheDocument()
  })

  it('badges untranslated volumes in Georgian when ka is selected (review S5)', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    fireEvent.click(screen.getByRole('combobox', { name: /language/i }))
    fireEvent.click(screen.getByRole('option', { name: 'ქართული (beta)' }))
    // Zork I HAS a ka corpus → no "English only" (ინგლისურად) badge.
    expect(
      screen.getByRole('radio', { name: /იმპერია/ }).textContent,
    ).not.toMatch(/ინგლისურად/)
    // Zork II has no ka corpus → Georgian "English only" badge, part of name.
    expect(screen.getByRole('radio', { name: /ფრობოზის/ }).textContent).toMatch(
      /ინგლისურად/,
    )
    expect(
      screen.getByRole('radio', {
        name: /ფრობოზის.*ინგლისურად|ინგლისურად.*ფრობოზის/,
      }),
    ).toBeInTheDocument()
  })

  it('localizes the language picker accessible name (de)', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'de', declined: false }),
    )
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(
      screen.getByRole('combobox', { name: /sprache/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('combobox', { name: /^language$/i }),
    ).not.toBeInTheDocument()
  })
})
