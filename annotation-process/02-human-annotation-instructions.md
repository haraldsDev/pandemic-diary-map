# Annotation instructions

Task: determine whether the author is physically present now at the mentioned geolocation.

## 1. What you are annotating

You are given a CSV file containing rows extracted from diary entries. Each row corresponds to one place mention in a diary entry. The same diary entry may appear in multiple rows if it mentions multiple places.

Important technical note:

- Please open and edit the CSV in Google Sheets
- Do not download and open the file in Excel
- Excel may break text formatting and special characters
- All annotation should be done directly in Google Sheets

## 2. What you see in the file

The columns appear in the following order:

- `author_there_now_1_0` — the field you will fill in
- `place_string` — the mentioned place (e.g. city, country, location)
- `kwic_sentence` — the sentence containing the place
- `entry_text` — the full diary entry
- `annotation_notes` — optional notes
- `annotation_id`
- `diary_id`
- `entry_date`
- `place_id`

In practice, annotation is based on the first four columns only. You will normally not need columns 6–9.

## 3. What “now” means in this task

“Now” refers to the diary’s current time frame, not only the exact moment of writing. In diary writing, the current time frame usually includes:

- the day on which the entry is written
- the immediately preceding day, if narrated as part of the same lived moment

Sometimes, an entry may describe events unfolding over several days or even weeks leading up to the present moment. In such cases, this period can still be treated as the current time frame, as long as the narration is clearly anchored in the author’s present lived situation.

Use your judgment to decide whether a place belongs to what the author treats as their current lived time, rather than a clearly distant past.

## 4. What values to put in `author_there_now_1_0`

Fill the cell with one of these three values only:

- `1` — the context of the entry gives enough information to safely conclude that the author is physically present at the mentioned place during the diary’s current time frame.
- `0` — at least one of the necessary conditions does not hold: the place is mentioned outside the current time frame, or the author is not there.
- `NA` — unclear / ambiguous. The entry does not provide enough information to make a confident decision.

If you choose `NA`, you may use `annotation_notes` to briefly explain why, or to note a recurring pattern where changes to the methodology could realistically improve annotation precision or later analysis.

## 5. How to decide

- Base your decision on the overall context of the `entry_text`
- You may use any part of the `entry_text`
- Use normal reading intuition
- Do not use outside knowledge about the author or the world

You are not required to look for explicit proof phrases. If the text does not provide sufficient contextual grounding, choose `0`.

## 6. Speed and confidence

This task is designed to be fast.

- Most decisions should take 5–15 seconds
- Do not overthink
- Trust your reading judgment and move on

## 7. Scope, time estimate, and stop rule

This dataset contains about 365 geolocation mentions (rows). Expected annotation time is 3–6 hours in total.

Important stop rule. If, after annotating approximately 120 rows (about one third of the dataset), you find that:

- you are producing many `NA` labels, or
- you are frequently using `annotation_notes` because the methodology feels unclear, inconsistent, or realistically improvable

stop annotation at that point and contact the responsible person. This checkpoint exists to allow methodological refinement before completing the full dataset.
