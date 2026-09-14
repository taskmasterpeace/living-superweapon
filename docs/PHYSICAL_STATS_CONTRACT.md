# Physical stat contract

`resolvePhysicalStats` is shared by character sheets and Fighter construction. Valid explicit attrs.mgt sets combat strength; valid attrs.vig sets HP using the existing creator formula 70 + 9 × Vigor. Without overrides, authored HP/strength remain unchanged.

Displayed Might matches combat strength. Removed the age adjustment that previously changed only displayed Might. Fighting retains its existing rank-derived baseline; Agility/Intellect age adjustments remain. No roster balance migration was performed.

Fine-grained def.rank intentionally remains authoritative for lifting capacity and rank-based clinch comparisons. It is not the same scale as 1–10 Might. Explicit rank overrides are retained; changing Might on a character with an explicit rank does not rewrite that rank. Vigor without an explicit override remains a descriptive durability rating derived from HP and body traits.

Validation: roster-wide Might/strength agreement regression failed before the fix. Stock HP/strength preservation and 47 person-carry tests pass. Gameplay changes to grab approach, hand alignment, throw impact and get-up are separate outstanding work.
