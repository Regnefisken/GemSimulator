/**
 * Bro mellem DOM-touch-UI (joystick / kig-flade) og `PlayerControls` i R3F.
 * `lookDelta` nulstilles i PlayerControls efter forbrug hver frame.
 */
export const mineMobileSurface = {
  /** Analog: x = strafe (− venstre, + højre), z = frem/tilbage (+ = fremad i blikket). */
  moveStick: { x: 0, z: 0 },
  /** Akkumulerede pixel-deltaer til yaw/pitch. */
  lookDelta: { x: 0, y: 0 },
}
