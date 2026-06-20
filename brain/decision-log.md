# 📓 Decision log — ADR léger (append-only)

Une entrée par décision. On n'édite pas le passé ; on ajoute une entrée qui
supersède si besoin. Format : DEC-NNN — titre / cause / décision / statut.

---

## DEC-001 — Bastille : `content/stations/bastille.json` réaligné sur le seed serveur

**Cause.** Les params client étaient périmés. Au palier **Gold**, le client donnait
**4 boulets** alors que le serveur en plafonne **3** (`answer_key.max_shots = 3`).
Dans `fn_submit_attempt`, `v_shots > v_max_shots` ⇒ `flagged`, score 0 → un joueur
honnête (utilisant son 4ᵉ boulet « offert » par le client) était marqué tricheur.
Écarts annexes : `hpMultiplier`, `targetPct` (silver 30 vs 35, gold 40 vs 50),
`timeLimitS` (gold 80 vs 75), `maxShots` (bronze 6 vs 5).

**Décision (board).** Le seed serveur est autoritatif ; le JSON le reflète à
l'identique. La difficulté n'est PAS redébattue ici (réservée à un futur sprint
scoring). Miroir appliqué :

| palier | maxShots | hpMultiplier | targetPct | timeLimitS | reinforced |
|--------|----------|--------------|-----------|------------|-----------|
| bronze | 5 | 1.0  | 0  | 0  | false |
| silver | 4 | 1.45 | 35 | 0  | false |
| gold   | 3 | 1.8  | 50 | 75 | true  |

Self-check : `maxShots(client) == max_shots(seed)` et `targetPct ==
min_destruction_pct(seed)` pour chaque palier — OK.

**Statut.** Appliqué (sprint « Cerveau Augmenté », transaction #001).

**Reste à flaguer (non traité, hors périmètre params-only).** La prose du brief
Gold dans `bastille.json` dit encore « quatre boulets comptés » alors que Gold =
3 boulets ; le `prompt` seed dit « trois boulets ». Copie à corriger dans un sprint
contenu (ne touche pas le scoring).
