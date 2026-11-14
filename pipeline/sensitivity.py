"""Test how much the ranking depends on the weights and on any single variable.

AI-generated: written by Claude (Anthropic) on 2026-11-14. Review before use.

Run from the repo root, after score.py:

    python3 pipeline/sensitivity.py

Three tests on the Jezero ranking in data/analogs.json:

1. Random weights. The eight weights are redrawn at random 5,000 times
   (each between 0 and 1) and the ranking is recomputed. A place that stays
   near the top under most draws does not owe its rank to one weight setting.
2. Leave one variable out. The ranking is recomputed eight times, each time
   without one variable.
3. Equal evidence. Only places with at least five variables are ranked, so a
   place cannot lead just because it has more evidence entered.

Writes data/sensitivity.json. The random draws use a fixed seed, so the
result is the same on every run.
"""

import json
import random
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "sensitivity.json"
DRAWS = 5000
SEED = 2026
MIN_VARIABLES = 5


def rank(places, weights):
    """Names ordered from best to worst under the given weights."""
    scored = []
    for place in places:
        matches = {k: v for k, v in place["feature_match"].items() if weights.get(k, 0) > 0}
        total = sum(weights[k] for k in matches)
        scored.append((sum(weights[k] * v for k, v in matches.items()) / total if total else 0.0, place["key"]))
    scored.sort(key=lambda item: -item[0])
    return [key for _, key in scored]


def main():
    data = json.loads((ROOT / "data" / "analogs.json").read_text(encoding="utf-8"))
    variables = list(data["variables"])
    base_weights = {k: v["weight"] for k, v in data["variables"].items()}
    places = [a for a in data["analogs"] if a["target_id"] == "jezero"]
    for place in places:
        place["key"] = f"{place['name']} ({place['lat']}, {place['lon']})"
    label = {p["key"]: p["name"] for p in places}

    baseline = rank(places, base_weights)
    watch = baseline[:12]

    rng = random.Random(SEED)
    top1 = dict.fromkeys(watch, 0)
    top3 = dict.fromkeys(watch, 0)
    top5 = dict.fromkeys(watch, 0)
    top10 = dict.fromkeys(watch, 0)
    for _ in range(DRAWS):
        order = rank(places, {k: rng.random() for k in variables})
        position = {key: i for i, key in enumerate(order)}
        for key in watch:
            top1[key] += position[key] < 1
            top3[key] += position[key] < 3
            top5[key] += position[key] < 5
            top10[key] += position[key] < 10

    def share(count):
        return round(100 * count / DRAWS, 1)

    random_weights = [{"baseline_rank": i + 1, "name": label[key],
                       "first_pct": share(top1[key]), "top3_pct": share(top3[key]),
                       "top5_pct": share(top5[key]), "top10_pct": share(top10[key])}
                      for i, key in enumerate(watch)]

    leave_one_out = {}
    for dropped in variables:
        weights = {k: (0 if k == dropped else w) for k, w in base_weights.items()}
        leave_one_out[dropped] = [label[key] for key in rank(places, weights)[:5]]

    rich = [p for p in places if len(p["feature_match"]) >= MIN_VARIABLES]
    equal_evidence = [{"rank": i + 1, "name": label[key]} for i, key in enumerate(rank(rich, base_weights)[:10])]

    OUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "produced_by": "pipeline/sensitivity.py",
        "places_ranked": len(places),
        "random_weights": {"draws": DRAWS, "seed": SEED,
                           "note": "Share of draws in which each place finished first, in the top 3, top 5 and top 10.",
                           "places": random_weights},
        "leave_one_variable_out": {"note": "Top 5 when one variable is removed.", "top5": leave_one_out},
        "equal_evidence": {"note": f"Ranking of only the {len(rich)} places with at least {MIN_VARIABLES} variables.",
                           "top10": equal_evidence},
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}\n")

    print(f"Random weights, {DRAWS} draws: share of draws in the top 1 / 3 / 5 / 10")
    for row in random_weights:
        print(f"  {row['baseline_rank']:2}. {row['name']:22} {row['first_pct']:5}% {row['top3_pct']:6}% "
              f"{row['top5_pct']:6}% {row['top10_pct']:6}%")
    print("\nLeave one variable out: top 5")
    for dropped, names in leave_one_out.items():
        print(f"  without {dropped:12} {', '.join(n.replace('Lake ', '') for n in names)}")
    print(f"\nEqual evidence ({len(rich)} places with at least {MIN_VARIABLES} variables): "
          + ", ".join(r["name"].replace("Lake ", "") for r in equal_evidence))


if __name__ == "__main__":
    main()
