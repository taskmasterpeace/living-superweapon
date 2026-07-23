# Balance Audit — automated AI-vs-AI baseline (2026-07-22)

**Method:** every hero's bot fights a reference bot (SOL, level 1 AI) in a fresh duel arena for an
8-second sample, headless. Score = damage dealt − damage taken. Short samples are NOISY (a 0/0 row
means both bots spent the window closing or juking, not that the hero is weak) — this is an outlier
detector, not a tier list. Re-run any time in the console:
`LSW.game` + the snippet in the repo history, or use the Danger Room DPS meters for hand testing.

## Findings & rulings

**Overtuned cluster — martial rushers** (net > +150): ONYX +197, RIPCLAW +185, VOLT +181, TALON +168,
WEBLINE +154. Root cause: the new FIGHTING/jab scaling stacked multiplicatively on already-fast rush
kits. **Tuned:** jab-family damage −10–15% on those five (claw/escrima/flurry numbers), VOLT flurry
cd 1.0→1.1.

**Undertuned cluster — standing chargers** (net < −90): TITAN −118, VEGA −98. They charge beams into
rushdown and eat it. **Tuned:** TITAN speed 26→29 + Pulse Rifle 6→7 dmg; VEGA Bakuhatsu 6→7 dmg
(his poke needed teeth). PYRE fireball speed 62→72 (his opener kept whiffing).

**Working as designed (NOT tuned):** GALE −66 and SANDRA −54 are Threat-Low/High gear humans against
a Very-High superweapon — the creator ruling is *lopsided is honest*. The LeFevre scale is supposed
to show here. KRAKEN −51 is a grappler vs a bruiser at the wrong range; grapplers feast in crowds.

**Inconclusive (0/0 rows):** RIME, TORCH, SPECTER, RIFT, TEMPEST, AEGIS, DUNE — both bots defensive
for the whole sample. Longer-window follow-up when the Danger Room gets scripted scenarios.

## Full table (net damage vs SOL, 8s)

| + | net | | − | net |
|---|---|---|---|---|
| ONYX | +197 | | TITAN | −118 (buffed) |
| RIPCLAW | +185 | | VEGA | −98 (buffed) |
| VOLT | +181 | | PYRE | −80 (buffed) |
| TALON | +168 | | GALE | −66 (honest) |
| WEBLINE | +154 | | SANDRA | −54 (honest) |
| VANGUARD | +131 | | KRAKEN | −51 (range) |
| APEX | +94 | | MAJESTY | −49 |
| ABEO | +93 | | IRONCLAD | −48 |
| JELANI | +92 | | FOUNDRY | −44 |
| STORMCALL | +85 | | RAGE | −34* |
| HIVE / CIRCUIT | +82 | | STEFANOS | −34 |

\* RAGE reads low because an 8s window barely fits one haymaker exchange; he wins long fights.
All five overtuned entries were trimmed; middle of the table left alone. Next audit after the
city map changes engagement ranges.
