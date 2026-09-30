# ISRO Semi-Cryogenic Delta Semantic Truth Review

## 1. Overview & Objective
This review manually audits the 6 candidate fact deltas previously emitted when comparing the two real production ISRO semi-cryogenic engine articles in Firestore:
- **Article 1 (Prior)**: `posts/jQ2IssXNX9zSqzVcGy6E` (*"ISRO Just Ran Its New Semi-Cryogenic Rocket Engine at Full Thrust for the First Time"*, created 2026-09-05)
- **Article 2 (Subsequent)**: `posts/KX0pvxG8rlBFOpB5cvi9` (*"ISRO tests semi-cryogenic engine power head at full 200-tonne thrust"*, created 2026-09-17, reporting on the 2026-09-05 test)

The objective is to establish the ground truth for each detected delta, verify semantic classification, and enforce that absence in a previous article's structured metadata is not misclassified as a real-world `value_changed` or user-facing `new_fact`.

---

## 2. Item-by-Item Truth Audit

| # | Candidate Property | Old Article Evidence (`jQ2IssXNX9zSqzVcGy6E`) | New Article Evidence (`KX0pvxG8rlBFOpB5cvi9`) | Ground Truth Classification | User-Facing | Reason |
|---|---|---|---|---|---|---|
| 1 | **thrust level tested: 200-tonne** | `quick_brief.key_number: { label: "full thrust achieved", value: "200 tonnes" }`<br>`takeaways[0]`: *"First 100% thrust run of semi-cryogenic powerhead at 200 tonnes on September 5 at Mahendragiri."* | `quick_brief.key_number: { label: "thrust level tested", value: "200-tonne" }`<br>`what_happened`: *"The power head operated at the full 200-tonne thrust level..."* | `additional_detail` | **`false`** | Both articles describe the identical 200-tonne thrust figure for the same September 5 test. The difference is purely JSON field naming (`full thrust achieved` vs `thrust level tested`). |
| 2 | **full thrust level: 200-tonne** | `full_article.what_happened`: *"ISRO successfully operated its Semi-Cryogenic Engine Power Head Test Article at the full 200-tonne thrust level..."* | `full_article.key_stats[0]: { label: "full thrust level", value: "200-tonne" }` | `additional_detail` | **`false`** | The 200-tonne metric was explicitly in Article 1 narrative text. Its appearance in Article 2's `key_stats` array is a formatting detail, not a real-world change. |
| 3 | **duration at full thrust: 5 seconds** | `quick_brief.three_things_to_know[1]`: *"Test lasted approximately 35 seconds with five seconds at full thrust..."*<br>`what_happened`: *"Within it, the powerhead operated at its full 200-tonne-equivalent thrust level for five seconds."* | `full_article.key_stats[1]: { label: "duration at full thrust", value: "5 seconds" }` | `additional_detail` | **`false`** | The 5-second duration at full thrust was explicitly reported in Article 1's key highlights and body text. |
| 4 | **total test duration: 35 seconds** | `quick_brief.three_things_to_know[1]`: *"Test lasted approximately 35 seconds with five seconds at full thrust..."*<br>`what_happened`: *"The run lasted approximately 35 seconds."* | `full_article.key_stats[2]: { label: "total test duration", value: "35 seconds" }` | `additional_detail` | **`false`** | The 35-second total duration was already explicitly reported in Article 1. |
| 5 | **test in PHTA hot-test series: 9th** | `quick_brief.three_things_to_know[1]`: *"...and was the ninth PHTA hot test."*<br>`what_happened`: *"This was the ninth PHTA hot test."* | `full_article.key_stats[3]: { label: "test in PHTA hot-test series", value: "9th" }` | `additional_detail` | **`false`** | The test sequence ordinal (9th hot test) was already established in Article 1. |
| 6 | **first test at full thrust: 100 percent** | `quick_brief.quick_summary`: *"ISRO successfully ran the powerhead of its semi-cryogenic engine at 100% thrust..."*<br>`what_happened`: *"Previous milestones had demonstrated: 94 tonnes / 47% ... 200 tonnes / 100%."* | `full_article.key_stats[4]: { label: "first test at full thrust", value: "100 percent" }` | `additional_detail` | **`false`** | The milestone achievement (100% full thrust for the first time) was already highlighted in Article 1. |

---

## 3. Summary of Semantic Review Findings

- **Total Detected Candidates**: 6
- **Classified as `additional_detail` / `no_change`**: 6 (100%)
- **Suppressed from User-Facing "What Changed"**: 6 (100%)
- **Ultimately User-Facing**: 0 (0%)

### Principle Established:
A fact is only considered a user-facing change (`userFacing: true`) if it represents a genuine real-world progression, correction, or newly introduced material development relative to the reader's prior knowledge. Structural differences in metadata schema or supplementary specifications of already-reported events must be classified as `additional_detail` and suppressed from the prominent "Since You Last Read" callout.
