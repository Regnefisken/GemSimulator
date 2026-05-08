/**
 * Cave `oreSlots` peger på pivot omkring klippens midte; negativ Y graver klippen let ned i grotten,
 * så den ikke står/væver på underlaget.
 */
export const MINE_SLOT_Y_SINK = -0.175

/**
 * @param extraSinkY ekstra fra `getRockLayoutParams` (typisk negativ); 0 = kun basis-sink («top» af nedgravning).
 */
export function sinkOreSlotPosition(
  pos: readonly [number, number, number],
  extraSinkY = 0,
): [number, number, number] {
  return [pos[0], pos[1] + MINE_SLOT_Y_SINK + extraSinkY, pos[2]]
}
