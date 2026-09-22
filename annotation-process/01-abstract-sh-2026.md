# Spatial Humanities 2026 Conference

‘Artificial Intelligence and Geotechnologies for Human Experiences’  
University of Minho – Portugal (Braga)  
23 to 25 September 2026

## Mapping Detachment: Geolocations in Pandemic Diaries

Matulis, Haralds1\*; Ļaksa-Timinska, Ilze1; Vēveris, Viesturs1

1. University of Latvia Digital Humanities Centre, Riga, Latvia

\*Corresponding author: haralds.matulis@lu.lv

## Background

This paper examines experience of space during Covid Pandemic, as documented in the Latvian Pandemic Diaries corpus.

Personal diary, as a form of “ego document”, occupies the domain between literature and history. Diary as a factual day by day account records the time as it was experienced. Diary as a personal literary writing allows the author to create idiosyncratic space, where factual mixes with imaginary, present events with memories of past and plans for the future.

Restrictions of movement during Covid strongly inhibited movement in the physical space, at the same time making people acutely aware of the space. The shared time frame and the shared situatedness in the events of Pandemic provide a rare chance to map shared experience of a life writing corpus.

Researching a corpus of 238 Latvian Pandemic diaries (see Reinsone et al 2025 about corpus creation and composition), this paper aims to achieve two goals:

1. Distinguish between geolocations where the author is “present now” and where the author is “not present now”. For operationalization of “now” we use a slightly wider temporal period, “current time frame”, – e.g, allowing also recounts of the recent events in the past linguistic tense, and other situations where author is describing recent events as current, which is typical in diaries. In the context of this research, we denote all instances of places where author is not present, as “referenced”– e.g., past memories, future plans, reflections on experiences of others, media news, etc.
2. Explore how well large language models (LLMs) can tackle classification of geolocations, especially when it has to consider a wider context, discourse and inferred presence.

## Methods

Pandemic Diaries corpus was collected by ILFA (Institute of Literature, Folklore, and Arts of the University of Latvia) in 2020/2021, by issuing a public call to document Covid Pandemic experience, as it was unfolding, in diaries and share them publicly. Most of the diaries were digital-born, the rest were digitized by authors before submitting. Full Pandemic Diaries corpus is available at: https://garamantas.lv/en/collection/1415829/Pandemijas-dienasgramatas-2020.

Then, in 2021, Pandemic Diaries corpus, was manually tagged for geolocations, gaining 3758 geolocations. Each location has geographical coordinates of latitude and longitude and other fields which allow different layers of mapping and cross-comparison. For this research paper we treat the manual expert annotations of geolocations as “ground truth”.

To distinguish between “present” and “referenced” places, 3 human annotators annotated a sample of 406 geolocations (10.8 % of total geolocations), with labels – 1 (present place), 0 (referenced place), NA (not applicable). Human inter-annotator agreement was assessed to evaluate the reliability of the annotation task. “Strict consensus” – defined as all three human annotators agreeing on either 1 or 0 – was achieved in 276 cases, representing 67.98% of the dataset. “Majority consensus” – defined as at least two annotators agreeing on a binary label 1 or 0 – covers 397 cases, or 97.78% of the dataset. Then 3 LLMs were employed for the sample dataset (406), using the same annotation schema and instructions.

## Results

All three tested LLMs show strong alignment with human judgments, but with performance differences. Mistral Medium 3.1 achieves the highest agreement, matching strict human consensus in 254 of 276 cases (92.03%), Claude Sonnet 4 (234/276; 84.78%), Gemini 2.5 Flash (229/276; 82.97%).

A more nuanced picture emerges when separating positive consensus (1) from negative consensus (0). Human annotators reached consensus on 172 positive cases and 148 negative cases. Tested LLMs show following alignment with human annotations. For positive consensus (1): Mistral Medium 3.1: 81.4%; Claude Sonnet 4: 69.2%; Gemini Flash 2.5: 68.0%. For negative consensus (0): Mistral Medium 3.1: 100.0%; Claude Sonnet 4: 98.7%; Gemini Flash 2.5: 96.0%.

All 3 models perform very strongly on negative cases (referenced place). As this is a linguistic task with discourse-level inference, which often requires temporal reasoning, deixis inference, narrative stance detection, and implicit presence detection, achieved LLM results could be considered good performance in natural language processing research and annotation workflows.

## Conclusion

1. Pandemic diaries are very different regarding experience of space. Of 238 diaries, 62 do not have even a single geolocation mentioned, pointing to very different practices of life writing.
2. Differentiating “present” and “referenced” geolocations proved to be a doable task, albeit harder as expected, as 3 human annotators could reach a common classification (present or referenced place) only in 68% of cases. Two of the main factors for this ambiguity is wide use of past tense in life writing to recount recent events, and fluid narrative structures of life writing where author merges different times and writing modes in one diary entry.
3. LLM classification of geolocations proved to be a viable choice in the workflow. Given the scores of human annotator agreements, LLMs performed comparably well and provided consistent classifications; on average LLMs that we tested tended to be stricter in assigning “presence” of author than human annotators, assigning “referenced” place more often.

**Keywords:** geolocations classification by LLMs; present and referenced space; life writing; Pandemic diaries.

## References

Bodenhamer, D. J., Corrigan, J., & Harris, T. M. (Eds.). (2015). *Deep maps and spatial narratives*. Indiana University Press.

Devlin, J., Chang, M.-W., Lee, K., & Toutanova, K. (2018). BERT: Pre-training of deep bidirectional transformers for language understanding. arXiv. https://doi.org/10.48550/arXiv.1810.04805

Dunn, S. (2017). Praxes of “the human” and “the digital”: Spatial humanities and the digitization of place. *GeoHumanities, 3*(1), 88–107. https://doi.org/10.1080/2373566X.2016.1245107

Glazkova, A., Kruzhinov, V., & Sokova, Z. (2021). Automatic text processing for historical research. In V. Sukhomlin & E. Zubareva (Eds.), *Modern information technology and IT education* (Vol. 1204, pp. 135–146). Springer. https://doi.org/10.1007/978-3-030-78273-3_14

Reinsone, S., Ļaksa-Timinska, I., Matulis, H., & Žvarte, E. (2025). Archiving uncertainty: Leveraging crowdsourcing methodology in documenting personal experiences of COVID-19. *Life Narrative and the Digital, 14*, LD1–LD34. https://doi.org/10.21827/ejlw.14.42325
