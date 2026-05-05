# Developer Cheat / Test Features Plan

Denne fil beskriver planen for at tilføje **test/cheat-værktøjer** til GemSimulator, så du nemt kan teste spillet under udvikling.

## 🎯 Formål

Tilføje to hurtige test-funktioner:
- **+1 Level** knap (øger spillerens level)
- **+1.000 Guld** knap (tilføjer 1000 currency/penge)

Disse værktøjer skal **kun** være tilgængelige i udviklings-tilstand (development mode).

## 📍 Krav

- Knapperne skal integreres **under tandhjulet (settings / gear icon)**
- Kun synlige når dev mode er aktiveret
- Skal være meget let at fjerne igen senere uden at efterlade "døde" kode
- Må ikke kunne aktiveres ved et uheld i produktion

## 🛠 Anbefalet Implementering

### 1. Dev Mode / Feature Flag
- Brug `import.meta.env.DEV` kombineret med en ekstra flag
- Opret en konstant: `ENABLE_DEV_CHEATS = import.meta.env.VITE_ENABLE_DEV_CHEATS === 'true'`
- Alternativt: Simpel boolean i en `config.ts` fil

### 2. UI Placering
- Åbn settings menu (tandhjulet)
- Tilføj en ny sektion nederst: **"Developer Tools"** (kun synlig i dev mode)
- Indenfor sektionen: To store, tydelige knapper
  - `Level +1`
  - `Guld +1000`

### 3. Teknisk Struktur (anbefalet)

**Ny fil:** `src/components/DevTools.tsx` eller `src/features/dev/DevCheatPanel.tsx`

**Funktioner der skal laves:**
- `addLevel(amount: number)`
- `addGold(amount: number)`

Disse funktioner skal kalde det eksisterende level- og currency-system.

### 4. Hvordan gøres det let at fjerne?

- Alt dev-relateret kode samles i én mappe (`src/dev/` eller `src/components/Dev/`)
- Brug én central feature flag
- Brug `if (!ENABLE_DEV_CHEATS) return null;` i komponenten
- Når du vil fjerne det permanent: Slet hele Dev-mappen + feature flag referencer

## 📋 Trin-for-trin Implementeringsplan

1. Opret feature flag (`VITE_ENABLE_DEV_CHEATS`)
2. Udvid settings menu med ny sektion
3. Lav DevTools komponent med de to knapper
4. Implementér `addLevel()` og `addGold()` funktioner
5. Tilføj korrekt state-opdatering
6. Test grundigt

## Noter

- Brug klare, tydelige labels (fx "[DEV] Level +1")
- Overvej at tilføje flere cheats senere (fx "Unlock All Gems", "Max Level" osv.)
- Overvej at logge alle cheat-brug i console for nem debugging

---

**Klar til brug:** Kopier gerne hele denne plan og giv den til Claude, når du vil have ham til at implementere det.