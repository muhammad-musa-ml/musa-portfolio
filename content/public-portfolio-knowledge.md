# Muhammad Musa — public portfolio knowledge

> Generated from the curated public biography, project notes and technical article drafts. Do not edit this generated file by hand.
> This is the complete public knowledge supplied to the portfolio assistant. It is not a full résumé or a dump of the private portfolio store.

## Answering with this material

- Keep the stated scope, ownership, status and measurement denominators. Planned work is not shipped work; submitted pull requests are not merged releases.
- The articles are new portfolio drafts. Do not invent a publication date, readership, independent review or additional personal preference.
- The interactive demonstrations explain selected ideas. They are not the original product, a live reviewer panel or a new research run.
- If a detail is absent, say it is not covered in the public notes. Do not infer private employment, contacts, credentials or personal circumstances.

## Biography

Computer science. Human consequences.

I’m Muhammad Musa, a computer science master’s student at UW–Madison. I work on language-model security, build healthcare software, and turn scattered ideas into useful systems.

From Lahore to Madison, the question I return to is simple. Who will this help? Sometimes the answer is a product. Sometimes it’s a better experiment. Often, it starts with finding out why something broke.

Teaching is part of that work, too. Explaining a system to someone else has a way of exposing the parts I don’t understand yet.

## Projects

### WUMI Health

Public page: /work/wumi
Category: Healthcare software

Who gets to see a patient’s record?

I built a patient-owned health record that connects clinical work across facilities, with consent enforced where the data lives.

My role: I led engineering across the Flutter application and PostgreSQL backend, working with a clinical co-founder and three engineering interns.

Outcome: One longitudinal record, with patient, clinician, laboratory and pharmacy workflows built around it.

Status: Product in development. Core clinical workflows are implemented; scheduling is in progress. The portfolio interaction uses synthetic information.

Technologies: Flutter, Dart, PostgreSQL, Supabase, FHIR R4, Row-level security

#### The problem

A patient’s history can be scattered across clinics, paper reports and separate systems. I wanted the record to follow the patient without making every person at every facility equally powerful.

#### The decision that shaped the system

I separated the interface’s permissions from the database’s authority. Roles, individual overrides, facility scope and patient consent are checked at the data boundary. A hidden button is useful guidance; it cannot be the security mechanism.

#### Making access visible

Cross-patient reads go through audited database functions. The patient can see an access history, grant or revoke sharing, and protect selected records. A QR health card carries an opaque identifier rather than medical information.

#### What is built

The implementation connects identity, patient timelines, clinical encounters, diagnostic orders, laboratory reports and pharmacy dispensing. I also built code-catalog validation and private file access. These are engineering controls, not a claim of clinical certification or complete medical-reference coverage.

#### What I would keep improving

The next delivery work includes scheduling and the surrounding operational workflows. AI summaries and external credential-dependent integrations are separate planned capabilities; I do not present them as live features.

Illustrative demo: /playground?demo=consent

Public sources:
- Visit website: https://wumihealth.com/

### RAG attack & defense

Public page: /work/research
Category: Language-model security

What does a defense cost?

I tested how poisoned source material changes a model’s answers, then measured what the defenses broke along the way.

My role: I co-authored this two-person study and led the advanced attacks, fused defense, ablations and evaluation. Waleed Arshad built the initial pipeline scaffold and early attack modules.

Outcome: A defense that reduced measured attack success also removed useful evidence. Reporting both changed the conclusion.

Status: Scoped research study at UW–Madison with public code and recorded results. The defense is not deployment-ready.

Technologies: Python, PyTorch, ChromaDB, Transformers, scikit-learn, Ollama

#### The threat model

The attacker could add passages to the retrieved corpus, but could not edit the user’s question or the system prompt. I studied the point where useful retrieved text becomes an instruction the generator should never have followed.

#### What I built

I developed obfuscated, semantic, fragmented and defense-aware attacks, a classifier-based fused defense, and an evaluation pipeline that preserves the retrieved evidence and generated answers. The classifier combines several signals; one proposed signal contributed almost no learned weight, which matters when describing the final mechanism.

#### The result worth keeping

In the paired T2 ablation on llama3.2:3b, attack success was 12% without a defense, 38% with a prompt-only defense and 0% with the fused defense, across 50 attack-paired queries. Those are results for that experiment, not a universal ranking of defenses.

#### The cost behind zero

On 50 clean queries, the fixed-threshold fused defense removed at least one retrieved chunk for 76% of queries. A later analysis separated the denominators: 31% of retrieved chunks were removed, 32% of queries combined removal with a degraded answer, and 34% were judged to have worse answers. Those metrics describe different effects; they are not interchangeable.

#### The limits

The corpus, model choices and attack families constrain the result. An attack that never retrieves its required fragments has not proved a defense strong. A model judge also has its own biases. I kept those limitations beside the scores rather than treating them as footnotes.

Illustrative demo: /playground?demo=defense

Public sources:
- Read the research code: https://github.com/muhammad-musa-ml/IPI-763
- Read the utility analysis: https://github.com/muhammad-musa-ml/IPI-763/blob/main/docs/phase5_honest_fpr.md

### Resume Gauntlet

Public page: /work/gauntlet
Category: Agent systems

Can the claim survive a second opinion?

I built a writing workflow that traces claims to evidence, then hands the draft to independent reviewers with permission to reject it.

My role: I designed and built the plugin, data model, review orchestration, document checks and guarded workflows.

Outcome: Eight review perspectives examine the rendered document; unsupported claims and failed checks block completion.

Status: Working personal tool with Claude Code and Codex adapters. The source repository is private.

Technologies: Python, Multi-agent orchestration, Claude Code, Codex, LaTeX, pytest

#### The problem

A fluent sentence can make a weak claim sound convincing. I wanted a system that keeps the original evidence close enough to challenge the wording, including the numbers, scope and ownership of the work.

#### Separate writing from judging

The workflow separates the writer from the verifier model family. Reviewers inspect a fixed artifact and report findings instead of silently editing the document they judge. The system checks whether the expected reviewers actually returned.

#### The artifact is part of the answer

A good source document can still become a broken PDF. I added checks against the rendered output, including parsing, layout and exact-artifact receipts. Reusing an old verdict after changing the page is not an acceptable shortcut.

#### Facts outlive a draft

Raw portfolio facts and their provenance live outside the plugin repository. A guarded correction path updates evidence without discarding unrelated facts. Published examples use synthetic identities, and sensitive actions remain separate from drafting.

### Kiln

Public page: /work/kiln
Category: Knowledge systems

Can an idea survive its bookmark?

I built a research library that turns saved material into practical guides while keeping the path back to every source.

My role: I built the ingestion, research, topic organization, publishing workflow and shared local/public website.

Outcome: Sources become useful guides, with citations, files and a publication process that verifies the actual live result.

Status: Live personal project. The public library is a curated static snapshot; private intake and write operations stay local.

Technologies: Python, SQLite, Full-text search, JavaScript, Content hashing, Vercel

#### From saved to useful

Keeping a link is easy. Remembering what it was useful for is harder. Kiln takes a source dossier, checks the practical claims against current evidence, and produces a guide that can hold instructions, prompts, files and project ideas together.

#### Keep the trail

I retain original source URLs and immutable input revisions. Related sources can become one topic, but merging is reversible and earlier links still resolve. Similar tags alone are not enough reason to collapse two different ideas.

#### Research is not implementation

A completed guide does not mean I built every project it suggests. Kiln tracks the owner’s progress separately and keeps project builds behind a separate queue decision. This makes the library a more honest record of work.

#### Publishing with a boundary

The public export includes only allowed fields and artifacts. Private notes, credentials and machine paths stay out. After deployment, the release workflow compares the live files with the exported hashes before calling the publication complete.

Illustrative demo: /playground?demo=provenance

Public sources:
- Visit website: https://kiln-by-m.vercel.app/
- Read the code: https://github.com/muhammad-musa-ml/kiln

### Small fixes, real boundaries

Public page: /work/open-source
Category: Open-source contributions

Make the contract match the behavior.

I trace small failures in shared tools back to their boundary: an oversized schema, a lingering environment flag, or metadata that never reaches its consumer.

My role: I authored scoped patches and regression tests in forks, then opened upstream pull requests with the reproduction, measured result and remaining limits.

Outcome: In a Notion MCP patch, the measured tools/list response fell from 76,259 to 23,749 bytes while retaining referenced definitions.

Status: Submitted upstream pull requests, open at the November 4, 2026 review. These are proposed fixes, not claims of merged releases.

Technologies: TypeScript, Python, JSON Schema, MCP, Vitest, pytest

#### A smaller tool contract

The Notion MCP converter attached every component definition to every tool. I changed it to retain only definitions reachable from that tool’s input parameters, following nested references and cycles. The measurement is response bytes, not tokens or a measured model-speed improvement.

#### Restore the state you borrowed

In Palantir’s OAuth client, a temporary environment variable stayed enabled after a token exchange when it had originally been absent. My patch removes it in that case and preserves a prior value. The process-global concurrency limitation remains; I did not claim to solve it.

#### A useful review starts with limits

Each PR records what the tests cover and what I did not run. A passing local regression demonstrates the patch’s intended behavior; it does not substitute for the maintainer’s review, every supported platform or a real client integration.

Public sources:
- Notion MCP schema pruning · PR #377: https://github.com/makenotion/notion-mcp-server/pull/377
- OAuth environment cleanup · PR #21: https://github.com/palantir/palantir-oauth-client/pull/21
- TypeORM view metadata · PR #13037: https://github.com/typeorm/typeorm/pull/13037

### Shahmukhi Punjabi NLP

Public page: /work/shahmukhi
Category: Language equity

Start with the language the tools overlook.

I fine-tuned a multilingual transformer and used uncertainty sampling to study topic classification with limited labeled data.

My role: In a two-person project, I owned model fine-tuning and active learning. Waleed Arshad owned data collection, augmentation and dataset creation.

Outcome: An experiment in where to spend a limited annotation budget, with explicit comparisons between data conditions.

Status: Completed academic research project. Results depend on the corpus, augmentation and script conditions.

Technologies: PyTorch, XLM-RoBERTa, Hugging Face, Active learning

#### My part

I worked on the model and the labeling strategy for a four-topic classification task in Shahmukhi Punjabi. The team contributed a labeled dataset and a larger transliterated corpus; I do not claim the dataset work as mine alone.

#### What the headline leaves out

The full augmented pipeline reached 92.9% accuracy. A controlled comparison under different script conditions produced substantially different results. I keep the experimental setup attached to the number rather than treating it as the accuracy of an entire language.

#### The useful question

Active learning asks which examples are worth labeling next. I used maximum-entropy uncertainty sampling to concentrate the annotation effort on examples the model found difficult.

### REPROD

Public page: /work/reprod
Category: Published security research

Make the evidence reproducible.

I co-authored work on ransomware execution provenance, helping turn sandbox observations into reusable research evidence.

My role: I was a co-author in the LUMS and SRI International collaboration published at ACM CSET 2023.

Outcome: An open dataset and collection pipeline for reproducible ransomware analysis.

Status: Published team research. The repository documents the collection pipeline; the dataset is available separately.

Technologies: Python, SPADE, Process Monitor, Provenance graphs, VirtualBox

#### Why provenance

A process log records events. A provenance graph helps connect the processes, files and dependencies behind them. The research used those relationships to make ransomware behavior more inspectable and experiments more reproducible.

#### The team’s contribution

The project released sandboxed execution logs, inferred provenance graphs and orchestration code. I present this as a collaborative publication, not a system I built alone.

#### A restrained conclusion

The paper’s pilot evaluated signatures across a defined set of ransomware families and benign traces. That supports a scoped research result, not a claim that the technique detects all ransomware.

Public sources:
- Read the paper: https://doi.org/10.1145/3607505.3607510
- Browse the dataset: https://doi.org/10.5281/zenodo.8123115
- Read the code: https://github.com/muhammad-musa-ml/reprod

### Small-GPU serving bench

Public page: /work/serving
Category: ML systems

Measure the queue, not just the tokens.

I served an open-weight language model on a 6 GB laptop GPU and measured the tradeoffs between precision, throughput, latency and answer quality.

My role: I built the load harness, evaluation runner and observability stack, and recorded the experiments.

Outcome: A repeatable comparison of FP16, AWQ and GPTQ serving, with raw results and hardware scope attached.

Status: Reproducible personal benchmark on one laptop. The quantized weights come from the model publisher; I did not quantize them myself.

Technologies: Python, vLLM, Docker, Prometheus, Grafana

#### The setup

I compared three precision variants of Qwen2.5-1.5B-Instruct using synthetic load prompts and a separate quality set. Model revisions were pinned, and the repository records the tested hardware and measurement conditions.

#### Two different load questions

Closed-loop workers show how throughput changes with concurrency. Open-loop arrivals expose what happens when requests arrive faster than the service can handle them. A server can produce more tokens and still make a person wait longer for the first one.

#### The tradeoff

The lower-precision arms used less weight memory and delivered more output tokens per second in this setup. Quality changed too, so I report it alongside latency instead of describing compression as a free improvement.

Public sources:
- Read the measurements: https://github.com/muhammad-musa-ml/vllm-serving-bench

### Replicated lookup service

Public page: /work/lookup
Category: Distributed systems

A failed replica should not end the request.

I rebuilt a property lookup service with a cache tier, replicated storage, bounded failover and three implementations of the same contract.

My role: I extended the course exercise into a standalone repository with Python, Java and Go servers, conformance checks, failure injection and deployment tooling.

Outcome: One API contract, replayed across three implementations, with recorded behavior when a replica dies or stops answering.

Status: Working personal systems project with public code and reproducible scripts. It is not a claimed production service.

Technologies: Python, Go, Java, gRPC, Docker, Kubernetes

#### Keep the contract

I implemented the dataset tier in three languages and built a conformance tool that replays keys against each. I also preserved an older protobuf contract to check compatibility in both directions.

#### Failover has a budget

The HTTP tier rotates between replicas, caches successful lookups and retries safe reads when a replica is unavailable or exceeds its deadline. It does not blindly replay arbitrary operations. Errors are not cached.

#### Make failure observable

Health checks, metrics and failure-injection scripts make it possible to see which replica answered and which failed first. The useful demonstration is a request completing through the remaining replica, followed by recovery.

Public sources:
- Read the code and experiments: https://github.com/muhammad-musa-ml/replicated-lookup-service

### TAP red-teaming experiments

Public page: /work/tap
Category: Language-model security

The evaluator changes the experiment.

I extended an existing red-teaming workflow and explored how the search and evaluator affected its results.

My role: I ran experiments, proposed a multi-evaluator extension, and presented the work in a UW–Madison course project.

Outcome: Exploratory runs and a proposal for evaluating different aspects of an attack separately.

Status: Course research using a fork of TAP/PAIR. Results were weak or inconclusive; this is not a measured safety-breakthrough claim.

Technologies: Python, TAP / PAIR, Tree search, GPT APIs, Weights & Biases

#### What I changed

I varied the search depth, width and branching in an existing Tree-of-Attacks-with-Pruning workflow and examined a multi-evaluator design. The framework was upstream work; my contribution was the experimentation and proposed extension.

#### What the result taught me

Evaluator capability and cost constrained the experiment. I keep the weak results visible because they change what the work supports: practical experience with model evaluation, rather than a universal jailbreak success rate.

### Voice Agent

Public page: /work/voice-agent
Category: Agent systems

Let the model speak. Keep control explicit.

I built a voice-workflow prototype that connects grounded research, verified pitches and a deterministic conversation controller.

My role: I designed and built the pipeline, data contracts, audio loop and state-machine boundaries.

Outcome: A working local simulation with business discovery, a writer/verifier loop, speech recognition and speech synthesis.

Status: Prototype. The documented version has not placed real phone calls. Discovery and voice components run locally; some writing and verification use cloud models.

Technologies: Python, asyncio, Pydantic, SQLite, faster-whisper, Ollama, Piper TTS

#### Separate language from control

The language model supplies wording inside a defined state. Typed classifiers and a deterministic state machine decide which transition is allowed. The audio loop supports interrupted playback rather than assuming the other person waits.

#### Carry evidence between stages

Discovery produces a structured facts artifact. A writer and an independent verifier use that grounding before the voice stage receives the resulting pitch. The contracts make the provenance of a statement inspectable.

#### The boundary of the prototype

The microphone and speaker stand in for a call. Self-authored policy checks and an opt-out store are engineering controls, not legal certification, and a latency target is not a measured result.

### Satellite building footprints

Public page: /work/satellite
Category: Computer vision

A model meets a different city.

I adapted a pretrained geospatial segmentation workflow to imagery of dense residential areas in Lahore.

My role: I worked with a teammate on the inference pipeline and geospatial deep-learning toolchain.

Outcome: Building-footprint masks from local satellite imagery, with qualitative inspection of where the model transferred and where it struggled.

Status: LUMS course project. Uses pretrained SpaceNet weights; no from-scratch training or quantitative IoU/F1 evaluation is claimed.

Technologies: PyTorch, Solaris, GDAL, Docker, VGG16 U-Net, SpaceNet-7

#### Make inference work end to end

I helped assemble the Solaris/GDAL environment, reconstruct pretrained weight files and connect resizing, data preparation and inference. The model required a consistent image size, so preprocessing was part of the result.

#### Keep the evidence at its actual scale

The output was assessed qualitatively. Dense residential layouts were the motivating case; close-up imagery exposed weaknesses. Training on local data and measuring overlap against labeled footprints remained future work.

### Social-media sentiment research

Public page: /work/extremism
Category: Published research

Sentiment needs context.

I led an early study of social-media sentiment following the killing of Priyantha Kumara Diyawadana, presented as an ASONAM poster.

My role: I was first author, with Muhammad Usama and Momin Uppal.

Outcome: A published two-page poster with preliminary analysis and a proposed context-aware research direction.

Status: IEEE/ACM ASONAM 2022 poster. Sentiment analysis is not the same as a validated extremist-content classifier.

Technologies: Python, Twint, Sentiment analysis, Data visualization

#### What I measured

The study collected a case-specific set of tweets and examined polarity and subjectivity. The visual analysis supported preliminary observations about the sample, not automatic judgments about individual people.

#### What remained a proposal

The poster outlined the context a fuller framework would need: offline events, online channels and the meaning of different content types. Building and validating that framework was beyond the poster's delivered scope.

Public sources:
- Read the poster: https://doi.org/10.1109/ASONAM55673.2022.10068622

### Adversarial sentiment classification

Public page: /work/sentiment-robustness
Category: Machine-learning robustness

How much can a few words change?

I trained a sentiment classifier and tested its sensitivity to small, constrained token substitutions.

My role: I built the classifier baseline and implemented a HotFlip-style adversarial attack.

Outcome: A comparison between ordinary test predictions and predictions after a small number of token substitutions.

Status: LUMS course project from 2023. The result concerns the trained classifier and its experimental setup, not all sentiment models.

Technologies: Python, PyTorch, CNN, LSTM, GloVe, HotFlip-style attacks

#### Establish the baseline

I trained a CNN/LSTM sentiment model over normalized movie reviews. The baseline provided a reference for separating the effect of the attack from ordinary classification errors.

#### Constrain the perturbation

The attack searched nearby candidates in GloVe embedding space while limiting the number of substitutions. That made it possible to inspect how a small textual change altered the classifier's decision.

### Multi-camera detection & stitching

Public page: /work/mask-detection
Category: Computer vision

Three cameras. One shared plane.

I worked on a mask/no-mask detector and projected detections from three camera views onto a common top-view plane.

My role: I built the course project with Suleman Mahmood.

Outcome: A YOLOv5s detector connected to a manually calibrated, three-camera homography prototype.

Status: LUMS computer-vision course project. Recorded detection scores used training images; they do not establish held-out accuracy. Tracking and duplicate removal were not implemented.

Technologies: Python, YOLOv5s, PyTorch, OpenCV, Homography, ffmpeg

#### Connect detection to geometry

We labeled video frames, trained a two-class detector and projected detection centroids into a shared floor plane. Four manually selected correspondences defined each camera's homography.

#### The limits are part of the demonstration

The cameras required manual calibration and the views used simple blending. The dataset was small and the recorded evaluation reused training images, so I present the pipeline and its limitations rather than a deployment-ready accuracy claim.

### TEKNOFEST fixed-wing UAV

Public page: /work/uav
Category: Engineering & leadership

Make the parts work together.

I led the electronics and systems sub-team for a fixed-wing UAV competition entry.

My role: I was project head and led a seven-person electronics and systems sub-team.

Outcome: The team finished among the global top 20 in the TÜBİTAK TEKNOFEST International UAV Competition.

Status: Team competition project, March–July 2021. My documented scope was component selection, autopilot-software selection and circuit design.

Technologies: SolidWorks, CAD, Circuit design, Electronics, Systems integration

#### Own the interfaces

I coordinated component decisions, autopilot-software selection and circuit design with the rest of the fixed-wing aircraft effort. The work depended on decisions made across the team, not on one isolated subsystem.

#### What I carry forward

The project gave me practice turning a competition brief into coordinated engineering responsibilities. I describe the documented electronics and design work without attributing unimplemented perception or autonomous-navigation features to it.

## Technical article drafts

### Dynamic workflows still need a stopping rule

Public page: /writing/dynamic-workflows-need-a-stopping-rule
Topics: Reading notes, Anthropic, Dynamic workflows, Agents, Evaluation, Orchestration
Related subject: gauntlet

Reading Anthropic’s dynamic-workflows article alongside the decisions I made in Resume Gauntlet: separate the work, verify the artifact, and make failure count.

#### The useful idea in the article

Anthropic describes dynamic workflows as task-specific orchestration: the system breaks down a problem, runs independent subagents, checks and challenges their findings, then combines the results. Progress persists across interruptions. The article also makes the cost visible: this can consume substantially more tokens than an ordinary session.

The part I want to examine is the checking step. Parallel work can cover more ground, but a larger collection of plausible answers is not automatically a more trustworthy result. I care about what a verifier receives, what it can change, and what happens when it disagrees with the writer.

#### A concrete version of the problem

Resume Gauntlet starts from evidence about someone’s work and produces a document. The failure I wanted to catch was not only bad grammar. A system can turn a team result into a sole-author claim, turn an experiment into a production claim, or keep a number while dropping the conditions that made it true.

I separated raw facts from rendered wording and made the review a distinct part of the workflow. Eight reviewer perspectives inspect the output. A plausibility check asks a different question from a parser check; neither replaces the other. Their value comes from the particular failure each is responsible for detecting.

#### Independence needs an implementation

In the canonical Claude workflow, writer and verifier model families must differ, and verifier tools are read-only. The reviewer reports a defect instead of rewriting the artifact it was supposed to judge. That preserves an inspectable relationship between the draft, the finding and the later fix.

I also check that expected reviewers returned. A missing report is not a passing report. Otherwise a broken orchestration step can make a run look cleaner simply by skipping the person, or agent, most likely to object.

This is a narrower, task-specific system than the broad workflows in Anthropic’s article. I am comparing design decisions, not claiming I implemented Claude’s dynamic-workflow runtime or that this project depends on that feature.

#### Check the thing that will be delivered

A verdict about an earlier draft should not quietly authorize a changed PDF. I bind validation to the artifact being delivered and inspect the rendered result. Layout, parse integrity and claim defensibility can all fail after a source-level edit that looked harmless.

The same principle appears in software review. If a worker returns a claim that a test passes, the orchestrator needs enough evidence to connect that result to the code under review. A summary without the artifact identity is easy to carry past the point where it stopped being true.

#### The stop condition is part of the product

A review system needs a defined response to rejection. In Resume Gauntlet, blocking outcomes keep the workflow unresolved, bounded fix loops attempt repairs, and missing verification must be reported. A completion message cannot be the only evidence that the work completed.

Reuse is useful when its conditions are explicit. An unchanged artifact and unchanged review requirements can justify carrying prior work. When either changes, the workflow needs to determine what must be checked again. Repeating every step wastes effort; carrying every old verdict hides risk.

That is the practical question I take from this reading: where is additional parallel work likely to change the answer, and where do I instead need a stronger contract between the work and its verification? For systems I build, I want the stopping rule to be something I can inspect and test.

Public sources:
- Anthropic: Introducing dynamic workflows in Claude Code: https://claude.com/resources/articles/introducing-dynamic-workflows-in-claude-code
- My Resume Gauntlet project notes: /work/gauntlet

### Only send the schema a tool needs

Public page: /writing/only-send-the-schema-a-tool-needs
Topics: Open source, MCP, TypeScript, Performance, Testing
Related subject: open-source

A Notion MCP pull request reduced the tool-list response by pruning unreachable definitions. The interesting work was proving what remained.

#### The response carried more than the tool used

In the Notion MCP server, each generated tool input schema carried all nine component definitions from the OpenAPI specification. A read tool with no object parameters still received structures for writing blocks, rich text and parents. The converter was attaching a shared inventory where it needed a dependency set.

I opened a pull request to retain only the definitions a tool could reach from its input parameters. On the real specification, the measured tools/list JSON-RPC response fell from 76,259 bytes to 23,749 bytes. The important unit is bytes: I did not measure tokenizer output, model latency or a particular client’s improvement.

#### Reachability, not a special case for read tools

It would have been easy to remove a few known definitions from a few known tool names. That would have encoded today’s specification in the fix. Instead, the converter starts from the input schema’s references and follows references within each definition until it has reached every dependency.

A visited set makes cycles finite. References inside unions, arrays, additional properties and query parameters still count. The traversal is conservative: a reference-looking field inside a default or enum can keep a definition even if that means retaining more than strictly necessary. Removing a needed structure would be a worse failure than keeping an extra one.

```text
pending = references in the tool parameters
while pending is not empty:
  visit one previously unseen definition
  add its references to pending
keep the visited definitions
```

#### Keep the shape, reduce the contents

The patch keeps the $defs key even when it becomes an empty object. Definitions that remain keep their original structure. Return schemas are unchanged, because this change targets the input contracts sent in tools/list. That gives a reviewer a narrower behavior to evaluate.

The tests cover synthetic dependency graphs and the actual generated tool list. The latter starts the proxy, connects an SDK client over an in-memory transport, calls listTools and checks the definitions each tool exposes. A separate walk in the test computes the expected reachable set instead of simply asserting that the helper returns its own output.

#### What the tests established

Six of the seven new tests failed against the original behavior. With the patch, the recorded run passed 119 tests across 15 files and built successfully. A manual stdio session measured the response itself after initialization, rather than estimating savings from source files.

This does not prove the patch fixes every client report associated with schema size. I did not test the client named in the original issue, and the local run was on Windows with Node 22. The contribution is a bounded improvement with a reproducible measurement and a clear review surface.

#### The status is part of the story

At the November 4 review, the upstream pull request was open and unmerged. I can describe the patch I wrote and the behavior I measured, but not present it as a released upstream feature.

What I like about this kind of engineering is that the before and after can be inspected. The code sends less irrelevant structure, preserves what a tool needs, and carries tests that fail when those promises stop holding. The reduction matters because the boundary is better defined, not just because the response is smaller.

Public sources:
- The upstream pull request, tests and measurement: https://github.com/makenotion/notion-mcp-server/pull/377

### When a safety score hides the cost

Public page: /writing/when-a-safety-score-hides-the-cost
Topics: AI safety, Evaluation, RAG, False positives, Research
Related subject: research

A defense reached zero attack success in one test. The more useful question was what happened to the clean answers.

#### The attractive number

In a paired experiment on llama3.2:3b, our fused defense stopped the measured T2 attacks. Attack success was 12% without a defense, 38% with a prompt-only defense and 0% with the fused defense. There were 50 attack-paired queries. It is a striking comparison, and an easy place to stop reading.

I do not think it is a sufficient account of the result. The same filter can remove malicious instructions and useful evidence. A retrieval system that avoids an attack by losing the information needed to answer has traded one failure for another. I wanted that tradeoff to be visible in the evaluation.

#### Give every percentage its denominator

The initial clean-query measure was deliberately strict: count a query whenever the defense removes at least one retrieved chunk. The fixed-threshold fused defense triggered that condition for 76% of 50 clean queries. That does not mean it removed 76% of chunks, and it does not mean 76% of answers were wrong.

Each query retrieved five chunks. Removing one of those five can leave enough information to answer; removing the only relevant passage can do much more damage. Combining both events into one flag makes the result easy to count but difficult to interpret. I kept the original measure and added more specific ones.

#### Three views of the cost

The first view counted removed chunks over all retrieved chunks: 31%. The second counted clean queries where removal coincided with a degraded answer: 32%. The third used a pairwise model judge to compare answers with and without the defense, independent of whether a removal occurred: 34% were judged worse.

These figures describe different populations and conditions. They refine the original 76% signal rather than replacing it with a more flattering score. In the public analysis, the definitions sit next to the results so a reader can tell exactly which event each percentage counts.

```text
removed chunks / all retrieved chunks
queries with removal and degradation / clean queries
queries judged degraded / clean queries
```

#### The evaluator needs scrutiny too

I compared saved defense-on and defense-off answers and randomized their A/B order, recording that assignment so it could be inspected. This reduces a source of position bias; it does not turn a model judge into ground truth. The report also records how ties, refusals and parse failures were handled.

The study remains small and specific. A single seed, one clean-query set and one target model cannot establish deployment safety. Other parts of the project exposed additional limits: a fragmented attack could fail because its pieces were not retrieved together, and a proposed defense signal could contribute almost no learned weight. Those details change what the headline is allowed to mean.

#### What I would carry into the next experiment

I would preserve the retrieved passages, filter decisions and answers as first-class results. Then I would measure security and utility separately across more seeds, domains and model sizes. If a decision changes the denominator, I would make that change explicit rather than compare the numbers as though they were the same experiment.

The useful outcome was not a claim that I had solved prompt injection. It was a clearer account of where a defense helped, where it hurt, and which next experiments could distinguish those effects. That is a much better starting point for a system someone might actually use.

Public sources:
- Experiment code and recorded results: https://github.com/muhammad-musa-ml/IPI-763
- Definitions and results for the three utility metrics: https://github.com/muhammad-musa-ml/IPI-763/blob/main/docs/phase5_honest_fpr.md

### A bookmark is not a research system

Public page: /writing/a-bookmark-is-not-a-research-system
Topics: Knowledge systems, Search, Provenance, Product engineering, Publishing
Related subject: kiln

What I changed in Kiln to keep ideas useful without losing the evidence, the uncertainty or the original source.

#### Saving was the easy part

A saved link is a promise to return. It is not yet a useful note. The interesting part might be a diagram halfway through a video, a tool mentioned without a link, or a technique that only works under conditions the creator never explains. Collect enough of those promises and the library becomes another inbox.

I built Kiln to close that gap. A source can become a practical guide with citations, files, commands and project ideas. The important design constraint is that the guide must not replace its evidence. I want to be able to ask where a statement came from after the polished explanation has made it feel obvious.

#### Split capture from research

The earlier workflow tried to acquire and understand the media itself. That made authentication, frame selection and transcription part of every research task. The current workflow starts from a Markdown dossier: the original URL, transcript or visual observations, named tools, claims and gaps are already captured.

Kiln saves an immutable revision before it changes the database. An identical completed revision is not new work; a changed revision becomes pending. From there, research can concentrate on checking current sources and producing something useful. A source’s confident wording is evidence to inspect, not permission to run its commands.

#### Merge the idea without erasing its history

Two sources can discuss the same practical problem in different language. Keeping both as isolated cards duplicates the work; merging everything with a shared tag loses useful distinctions. I compare purpose and subject, using specific terms, tools, repositories and original URLs to find candidates. A broad category alone does not establish that two items belong together.

When sources do become one topic, the originals remain attached. Membership can be reversed, and earlier item links still resolve. That makes organization a decision I can revisit instead of a destructive cleanup operation. Disagreements and different methods should survive the synthesis when they matter to the task.

#### Keep finished research separate from finished work

A good tutorial can suggest ten projects. It cannot make all ten projects real. Kiln tracks the owner’s outcome separately from whether research is complete, and building a proposed project requires a separate queue decision. That boundary is small in the interface and important in the data model.

The same distinction applies to unresolved evidence. Missing sources or a failed artifact leave an item pending with a retryable error. I would rather retain a useful incomplete record than disguise a missing step as a successful pipeline run.

#### A publish button is only the beginning

The local workspace and public library serve different purposes. The public site is a static snapshot. It receives an allowlisted set of fields and artifacts, while private notes, raw intake, credentials and machine paths remain local. Sharing a common interface does not require sharing all the underlying capabilities.

After deployment, the workflow compares the live files with the exported hashes. A successful export or push is not sufficient proof that the reader is seeing the intended version. This is the same lesson a small visual website change can teach: verify the thing the person receives, not only the command that produced it.

The result I want from Kiln is modest but useful. Find an idea, understand how to apply it, see what is uncertain, and follow the trail back. The library earns its place when that takes less effort than reconstructing the research from the original bookmarks.

Public sources:
- Kiln’s current workflow and code map: https://github.com/muhammad-musa-ml/kiln
- The public research library: https://kiln-by-m.vercel.app/

### A spotlight without the rings

Public page: /writing/a-spotlight-without-the-rings
Topics: Graphics, Three.js, Shaders, Interaction design, Debugging
Related subject: portfolio

A small visual defect in this site turned into a useful distinction: lighting the background and revealing its geometry are different operations.

#### The detail that broke the illusion

The background of this site used a cursor spotlight to reveal a constellation. The interaction was meant to feel quiet: a dark surface, a small warm pointer, and a little structure emerging as I moved. Broad blue-black rings around the pointer made the surface feel like a stack of effects instead.

The distinction mattered more than the size of the change. I still wanted the spotlight. I did not want the empty background to become a visibly shaded disk. Removing the interaction entirely would have hidden the symptom without preserving the design.

#### Reveal the marks, leave the surface alone

The earlier implementation placed a veil over the scene. A later version used a CSS mask to fade the rendered constellation. I moved the reveal into the point and line materials, where it could change the opacity of the geometry without painting a separate gradient across otherwise empty pixels.

The material compares the current fragment position with the pointer, divides by the spotlight radius, and uses the resulting distance to calculate a falloff. Points and line fragments receive that opacity adjustment. A pixel where the scene drew nothing remains the original matte surface.

```text
distanceFromPointer = distance(fragment, pointer) / radius
geometryOpacity *= reveal(distanceFromPointer)
// Empty background pixels receive no extra tinted layer.
```

#### Coordinates are part of the visual design

Pointer events arrive in browser coordinates. The shader works in drawing-buffer pixels, with a different vertical origin. The implementation accounts for the renderer’s pixel ratio and flips the pointer’s vertical coordinate before sending it to the material. A correct equation in the wrong coordinate system still produces the wrong interaction.

I also kept the pointer easing dependent on elapsed time rather than assuming every display draws the same number of frames. That lets the spotlight follow smoothly without making the intended response depend entirely on refresh rate. It is a small piece of engineering in service of a very simple visual promise.

#### Fixing the rings did not settle the brightness

After the rendering change, the live background could still feel too dim. Brightness outside the spotlight and the amount of fading while the pointer rested were separate controls. I adjusted those without changing the palette. That was a useful reminder that a technically correct fix does not automatically match the visual intention.

For the next design, the requirement became more specific: a fully matte surface, with the hidden geometry visible only under the cursor. That changes the ambient visibility target, but keeps the same separation between the surface and the thing being revealed.

#### Verify the delivered page

I checked the production build and the assets served by the public URL, then inspected the actual page. An up-to-date deployment and the right visual result answer different questions; both need checking. A user describing a translucency difference is giving useful evidence even when the deployment contains the expected commit.

The part worth reusing is not a particular shader trick. It is the decision to give each visual layer one job, then test the interaction in the place people will experience it. A quiet effect stops feeling quiet as soon as its implementation becomes the most visible thing about it.

Public sources:
- The published spotlight implementation: https://github.com/muhammad-musa-ml/musa-portfolio/blob/832355c2345bd82157a35e9dfa01a701bab24fab/src/three/useTorchlight.ts
- The material-rendering change: https://github.com/muhammad-musa-ml/musa-portfolio/commit/ee1754ec271fa9b929357fc7ee7ee7bab5cfb311
