# Annotation process

This folder is the present / referenced classification of place mentions. The map does not load these files.

Read in this order:

1. `01-abstract-sh-2026.md` — what the study claims. The `.docx` is the same text.
2. `02-human-annotation-instructions.md` — the task given to human annotators: label `1` (present), `0` (referenced), or `NA`. The `.docx` is the same text.
3. `03-human-annotator-evidence-rules.md` — for human annotators: what may be inferred from the diary entry, and what may not. The `.docx` is the same text.
4. `04-llm-annotation-prompt.md` — the prompt given to the models. It is not the human instruction sheet.
5. `05-llm-batch-notebook.ipynb` — the Colab notebook that sends diary entries to an LLM with that prompt. A text field asks for the Google Drive folder. That folder must contain `04-llm-annotation-prompt.md` and `28-input-csv-for-LLM-to-annotate.csv`. The notebook does not read those files from this GitHub folder by itself.
6. `28-input-csv-for-LLM-to-annotate.csv` — the input the models received: 90 diary entries, with the 406 place tasks packed into `geolocation_tasks`.
7. `human-annotations/` — the filled tables, 406 rows in the same order:
   - `06-ilze-annotations.csv`
   - `07-viesturs-annotations.csv`
   - `08-haralds-annotations.csv`

Strict agreement of all three annotators on `1` or `0` is 276 of 406 rows (67.98%). The counts and model comparison are in the abstract.
