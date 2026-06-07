// src/llm/scene/types.ts
/** An object the player can reference this turn. */
export interface SceneObject {
  canonical: string
  adjectives?: string[]
  carried?: boolean // in inventory → stays in scope across rooms
}

/** The per-turn view the grammar/prompt/validator consume. */
export interface Scene {
  inScope: SceneObject[]
  antecedent: string | null // most-recently-named canonical noun ("it" target)
}

/** A turn-boundary observation, derived from the live ViewState + last command. */
export interface SceneEvent {
  location: string // current room (status.location)
  outputText: string // the room/response block since the last input
  lastCommand: string | null // the canonical command we last sent, if any
}

/** Swappable scene source. Text impl now; Z-object-table impl later. */
export interface SceneProvider {
  observe(event: SceneEvent): void
  scene(): Scene
  reset(): void // new game / story change
}

/** Internal reducer state (carries the dedup key for idempotency). */
export interface SceneState {
  location: string | null
  inScope: SceneObject[]
  antecedent: string | null
  lastKey: string | null
}

export const emptySceneState: SceneState = {
  location: null,
  inScope: [],
  antecedent: null,
  lastKey: null,
}
