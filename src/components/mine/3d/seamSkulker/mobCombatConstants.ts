/** Fælles jagt/angreb for procedural skulker og crystal beast — hold synkroniseret. */
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
/** Nærmeste afstand hvor uhyret må starte angreb (nærkamp). */
export const MOB_STRIKE_NEAR = 0.48
export const MOB_STRIKE_FAR = 2.08
/** Moment i STRIKE-fasen hvor skade registreres (synk med slam). */
export const MOB_STRIKE_DAMAGE_AT = 0.42
