/** Fælles jagt/angreb for procedural skulker og crystal beast — hold synkroniseret. */
/**
 * Mindre end dette = ingen reel translation denne frame.
 * Tidligere brugtes 0.002 som grænse for gang-animation; ved jagt lige inden for `MOB_COMBAT_OUTER`
 * er `step` ofte mindre end det, så modellen flyttede sig stadig (svæv/glide) uden walk.
 */
export const MOB_STEP_MOVED_EPS = 1e-8

export const MOB_CHASE_SPEED = 2.85
export const MOB_RETREAT_SPEED = 2.65
/** Stop jagt her — holder afstand til spilleren. */
export const MOB_COMBAT_OUTER = 1.86
/** Kun ved næsten overlap: skub væk (angreb tjekkes før dette — se SeamSkulkerMob). */
export const MOB_TOO_CLOSE = 0.38
export const MOB_ATTACK_COOLDOWN = 2.25
export const MOB_WINDUP_DUR = 0.55
export const MOB_STRIKE_DUR = 0.2
export const MOB_RECOVERY_DUR = 1.15
/** Samlet logisk kampvarighed — GLB angrebsklip skaleres hertil via `AnimationAction.timeScale`. */
export const MOB_COMBAT_PHASE_DUR =
  MOB_WINDUP_DUR + MOB_STRIKE_DUR + MOB_RECOVERY_DUR
/**
 * Mindste afstand for at måtte starte angreb. Under `MOB_TOO_CLOSE` men over denne grænse:
 * angreb tjekkes før retreat (ingen “død zone” mellem 0.38 og gammel 0.48).
 */
export const MOB_STRIKE_NEAR = 0.36
export const MOB_STRIKE_FAR = 2.08
/** Moment i STRIKE-fasen hvor skade registreres (synk med slam). */
export const MOB_STRIKE_DAMAGE_AT = 0.42
