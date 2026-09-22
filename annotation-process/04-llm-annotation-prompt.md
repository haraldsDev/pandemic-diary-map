LLM Annotation Prompt (single diary entry, separator-based format)

Task
You are annotating the text of a single diary entry.
Within this diary entry, there are multiple geolocation annotation tasks.
For each annotation task, determine whether the author is physically present at the specified geolocation during the diary’s current time frame.

Input structure
You will receive the following input fields:
diary_id – identifier of the diary entry


entry_text – the full text of this diary entry


geolocation_tasks – a serialized list of annotation tasks


Each annotation task inside geolocation_tasks has the following structure:
annotation_id=... ⟦⟦FIELD⟧⟧ place_string=... ⟦⟦FIELD⟧⟧ kwic_sentence=...

Multiple annotation tasks are separated by:
⟦⟦TASK⟧⟧

Process each annotation task independently, but always interpret it in relation to the same entry_text.
Produce exactly one output row for every annotation_id provided.
Output rows must follow the same order as annotation tasks appear in geolocation_tasks.

Important notes about markup
The text may contain <a>...</a> markup.
 Treat this markup as part of the surface text only.
Do not assume that every <a>...</a> span marks a geographic location.


Do not reinterpret, merge, skip, or correct annotation tasks.


Always classify the provided place_string, even if it appears noisy or non-geographic.



Scope of interpretation
Base your decision only on the provided text.
 Do not use outside knowledge about the author or the world.

Definition of “current time frame”
“Current time frame” refers to the author’s present lived situation as narrated in the diary entry. This usually includes:
the day of writing


the immediately preceding day, if narrated as part of the same lived moment


sometimes a short unfolding period (several days or weeks), if clearly anchored in the author’s present situation


Mentions of:
distant past


background information


travel origins


general statements or hypotheticals


are not part of the current time frame.

Annotation labels
Assign exactly one value:
1 – The text provides sufficient contextual evidence that the author is physically present at the place during the current time frame.


0 – The author is not there, the place is mentioned outside the current time frame, or there is insufficient grounding.


NA – The text is genuinely ambiguous and does not allow a confident decision.


If evidence is insufficient, prefer 0 over guessing.
 Use NA only when ambiguity is unavoidable.

Additional required outputs
For each annotation task, also provide:
confidence_0_100
An integer between 0 and 100, where:
0 = not confident at all


100 = extremely confident


Use the full range realistically; do not default to extreme values.

annotation_notes
A short justification explaining why the label was chosen.
Requirements:
7–15 words


Must refer to textual or narrative cues


Must not rely on outside knowledge


Must not use abstract phrases like “the context suggests”


The justification should reference narrative cues (movement, arrival, duration, presence, absence), not abstract phrases like “the context suggests”.

Output format (strict)
Return one CSV row per annotation task, with no header and no additional text, in the following order:
annotation_id,author_there_now_1_0,confidence_0_100,annotation_notes

Example (format only):
1416816,1,94,Author narrates arrival, movement, and overnight presence at this location

Do not wrap the output in code blocks or quotation marks.
Any deviation from this format is an error.

