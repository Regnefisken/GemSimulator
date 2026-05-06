# Verdenskortet – Inspiration til levendiggørelse

## Nuværende tilstand
- Simpel grid af `LocationCard`-komponenter med emoji, navn, beskrivelse og låsekrav.
- Føles fladt og statisk.

## Vision
Gør verdenskortet til en rigtig stemningsfuld og levende menu, der føles som en del af spillets fantasy-verden.

### Muligheder (simpelt -> avanceret)

### 1. Forbedrede LocationCard (hurtigeste gevinst)
- Tilføj et `image`-felt i `src/data/areas.ts` for hver lokation.
- Vis billedet øverst i kortet (400×280 px anbefalet).
- Bedre hover-effekter: scale, glow, shadow, opacity på locked kort.
- Locked kort: mørkere filter + låse-ikon + krav i rødt.

### 2. Klikbare billedkort (anbefalet start)
Hvert sted bliver et rigtigt billede med overlay-tekst.  
Eksempel på data:
```ts
{
  id: "jernkloeften",
  name: "Jernkløften",
  image: "/assets/locations/jernkloeften.webp",
  ...
}
```
