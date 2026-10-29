# ASR & speaker-tech fact sheet (verified 2026-10-28)

For the speech-technology series. Every row has a source URL. **U / UNVERIFIED** = not confirmed against a primary source in this session; do not publish those without checking. Spot checks done by the lead: HF API metadata (Topic A.0), Qwen3-ASR and Dolphin READMEs, the Nemotron-3-Diarization card, sherpa-onnx and pyannote releases via `gh`, and the sherpa-onnx tree / Qwen3-ASR hotwords config.

# Topic A: Mainstream ASR models (as of 2026-10-28)

Legend: V = checked against a primary or near-primary source in this session. U = UNVERIFIED (from prior knowledge or a secondary source only). Arch: CTC / TDT (Transducer) / AED (attention encoder-decoder) / NAR (Paraformer-style) / LLM (audio encoder + adapter + LLM decoder).

### A.0 Hugging Face API metadata spot-check (fetched 2026-10-28 from `https://huggingface.co/api/models/<id>`)

createdAt = repo creation date (can precede the public announcement by days to weeks). Params = safetensors total, which includes the audio encoder and so is often larger than the marketing name.

| HF repo | createdAt | License tag | Params (safetensors) |
|---|---|---|---|
| openai/whisper-large-v3 | 2023-11-07 | apache-2.0 (HF card tag; the GitHub code is MIT) | 1.54B |
| openai/whisper-large-v3-turbo | 2024-10-01 | mit | 809M |
| FunAudioLLM/SenseVoiceSmall | 2024-07-03 | other (FunASR model license) | n/a |
| FunAudioLLM/Fun-ASR-Nano-2512 | 2025-12-15 | apache-2.0 | n/a |
| Qwen/Qwen3-ASR-1.7B / -0.6B / Qwen3-ForcedAligner-0.6B | 2026-01-28 | apache-2.0 | 2.35B / 0.94B / 0.92B |
| FireRedTeam/FireRedASR-AED-L / -LLM-L | 2025-01-24 / 2025-02-10 | apache-2.0 | n/a |
| FireRedTeam/FireRedASR2-AED / -LLM | 2026-02-12 / 2026-02-24 | apache-2.0 | n/a |
| nvidia/parakeet-tdt-0.6b-v2 | 2025-04-15 (announced 2025-05) | cc-by-4.0 | n/a |
| nvidia/parakeet-tdt-0.6b-v3 | 2025-08-04 | cc-by-4.0 | 627M |
| nvidia/canary-1b-v2 | 2025-08-04 | cc-by-4.0 | 979M |
| nvidia/canary-qwen-2.5b | 2025-06-26 | cc-by-4.0 | 2.56B |
| moonshotai/Kimi-Audio-7B-Instruct | 2025-04-25 | mit | 9.77B |
| stepfun-ai/Step-Audio-2-mini | 2025-08-28 | apache-2.0 | 8.32B |
| XiaomiMiMo/MiMo-Audio-7B-Instruct | 2025-09-18 | mit | 8.02B |
| zai-org/GLM-ASR-Nano-2512 | 2025-12-09 | mit | 2.26B |
| mistralai/Voxtral-Mini-3B-2507 | 2025-07-01 | apache-2.0 | 4.68B |
| mistralai/Voxtral-Mini-4B-Realtime-2602 | 2026-01-21 | apache-2.0 | 4.43B |
| microsoft/VibeVoice-ASR | 2026-01-21 | mit | 8.67B |
| microsoft/Phi-4-multimodal-instruct | 2025-02-24 | mit | 5.57B |
| ibm-granite/granite-speech-3.3-8b | 2025-04-14 | apache-2.0 | 8.65B |
| DataoceanAI/dolphin-small | 2026-05-13 (re-upload; original release 2025-03) | apache-2.0 | n/a |

## 1. Closed / API models

| Model | Org | Release | Arch | Streaming | Languages | Notes | Source | Status |
|---|---|---|---|---|---|---|---|---|
| gpt-4o-transcribe / gpt-4o-mini-transcribe | OpenAI | 2025-03 | LLM (GPT-4o based) | Streaming output; Realtime API | ~100 (multilingual) | prompt support, no word timestamps | https://openai.com/index/introducing-our-next-generation-audio-models/ | U (date) |
| gpt-4o-transcribe-diarize | OpenAI | 2025-10 | LLM | Not in Realtime API (community report) | multilingual | `diarized_json` output with speaker + segment timestamps; up to 4 reference speakers; no prompting | https://community.openai.com/t/introducing-gpt-4o-transcribe-diarize-now-available-in-the-audio-api/1362933 | V (forum announcement) |
| Newer 2026 OpenAI transcribe models | OpenAI | — | — | — | — | none found in search | — | U |
| Seed-ASR / Doubao ASR (豆包大模型语音识别) | ByteDance | paper 2024-07; API | LLM (AcLLM) | API streaming | zh + dialects, en, more | context-aware; API only, no weights | https://arxiv.org/abs/2407.04675 | U |
| Qwen3-ASR-Flash | Alibaba Qwen | 2025-09 | LLM | API | 11 languages (U) | API-only predecessor of the open Qwen3-ASR | https://github.com/QwenLM/Qwen3-ASR | U |
| Voxtral Mini Transcribe V2 (batch, API) | Mistral | 2026-02-04 | LLM | No (batch) | 13 | diarization, context biasing, word timestamps; ~$0.003/min (secondary source) | https://docs.mistral.ai/capabilities/audio/speech_to_text | V |

## 2. Open-weight models

| Model | Org | Release | Arch | Streaming | Languages | Params | License | Notable | Source | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Whisper large-v3 | OpenAI | 2023-11 | AED | No | 99/100 | 1.55B | MIT | LID, segment timestamps, translation to English | https://huggingface.co/openai/whisper-large-v3 | U |
| Whisper large-v3-turbo | OpenAI | 2024-10 | AED (4 decoder layers) | No | 99 | 809M | MIT | much faster; translation weaker | https://huggingface.co/openai/whisper-large-v3-turbo | U |
| Paraformer-large (zh) | Alibaba DAMO / FunASR | 2023 | NAR (CIF) | No | zh (+en) | ~220M | FunASR model license | timestamps, hotword variant (SeACo-Paraformer) | https://github.com/modelscope/FunASR | U |
| Paraformer-streaming | Alibaba / FunASR | 2023 | NAR, chunked | Yes | zh | ~220M | same | 2-pass online service | https://github.com/modelscope/FunASR | U |
| SenseVoice-Small | Alibaba FunAudioLLM | 2024-07 | NAR, CTC-style encoder-only | No | zh, yue, en, ja, ko | ~234M | FunASR model license | LID, emotion (SER), audio event (AED) tags, ITN; very fast | https://github.com/FunAudioLLM/SenseVoice | U |
| Fun-ASR-Nano-2512 | Alibaba Tongyi / FunAudioLLM | 2025-12 | LLM | Low-latency realtime claimed (GGUF builds expose neither streaming nor timestamps) | zh (incl. dialects), en, ja; MLT sibling has 31 languages | ~800M (U) | Apache-2.0 (HF tag) | hotwords; Fun-ASR (full) is API-only | https://huggingface.co/FunAudioLLM/Fun-ASR-Nano-2512 | V (existence, license 2025-12-15), U (size) |
| Qwen3-ASR-1.7B / 0.6B | Alibaba Qwen | 2026-01 (README: 2026-01-29) | LLM (AuT encoder + Qwen3) | Yes (toolkit supports streaming) | 30 languages + 22 Chinese dialects (= "52"); also singing / songs with BGM | 1.7B / 0.6B nominal (safetensors total 2.35B / 0.94B) | Apache-2.0 | LID; offline/streaming unified in one model; vLLM; native Transformers since 2026-06-26; arXiv 2601.21337 | https://github.com/QwenLM/Qwen3-ASR | V |
| Qwen3-ForcedAligner-0.6B | Alibaba Qwen | 2026-01 | NAR LLM-based aligner | — | 11 | 0.6B | Apache-2.0 | timestamps for any unit, audio up to 5 min | https://github.com/QwenLM/Qwen3-ASR | V |
| FireRedASR-AED / -LLM | Xiaohongshu FireRed | 2025-01 | AED (1.1B) / LLM (8.3B, Qwen2-7B) | No | zh, dialects, en | 1.1B / 8.3B | Apache-2.0 | strong Mandarin CER; lyrics | https://github.com/FireRedTeam/FireRedASR | U |
| FireRedASR2-AED / -LLM (FireRedASR2S suite) | Xiaohongshu FireRed | AED 2026-02-12, LLM 2026-02-24/25 | AED / LLM (encoder-adapter-LLM) | No | Mandarin, dialects, en, code-switching | U | Apache-2.0 | avg CER: LLM 2.89 Mandarin / 11.55 dialect, AED 3.05 / 11.67; AED has word timestamps and confidence; suite adds VAD and punctuation; arXiv 2603.10420 | https://huggingface.co/FireRedTeam/FireRedASR2-AED | V |
| Parakeet-TDT-0.6B-v2 | NVIDIA | 2025-05 | FastConformer + TDT | Offline (chunked streaming possible) | en | 600M | CC-BY-4.0 | word timestamps, punctuation; long-time #1 on Open ASR LB | https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2 | U |
| Parakeet-TDT-0.6B-v3 | NVIDIA | 2025-08 (OpenRouter's "2026-05" looks wrong) | FastConformer + TDT | Offline | 25 European languages, auto LID (no zh) | 600M | CC-BY-4.0 | timestamps | https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3 | V (langs, license), U (date) |
| Canary-1B-v2 | NVIDIA | 2025-08 | AED (FastConformer + Transformer) | No | 25 EU languages; ASR + en<->X translation | ~1B | CC-BY-4.0 | timestamps | https://huggingface.co/nvidia/canary-1b-v2 | U |
| Canary-Qwen-2.5B | NVIDIA | 2025-07 | LLM (FastConformer + Qwen3-1.7B, LoRA) | No | en | 2.5B | CC-BY-4.0 | topped Open ASR LB at launch (~5.6 WER, U) | https://huggingface.co/nvidia/canary-qwen-2.5b | U |
| Kimi-Audio-7B | Moonshot | 2025-04 | LLM (Whisper-based encoder + Qwen2.5-7B) | No | zh, en | ~7B | MIT (code) / model license U | general audio LLM; strong AISHELL / WenetSpeech | https://github.com/MoonshotAI/Kimi-Audio | U |
| Step-Audio 2 mini | StepFun | 2025-08 | LLM (end-to-end audio LLM) | — | zh, en, dialects | ~8B | Apache-2.0 | ASR plus paralinguistics; tool calling | https://github.com/stepfun-ai/Step-Audio2 | U |
| MiMo-Audio-7B | Xiaomi | 2025-09 | LLM (audio tokenizer + MiMo-7B) | — | zh, en | 7B | MIT (U) | general audio LLM; few-shot; not ASR-specialised | https://github.com/XiaomiMiMo/MiMo-Audio | U |
| GLM-ASR-Nano-2512 | Zhipu / Z.ai | 2025-12 | LLM | No | zh (Mandarin, Cantonese, dialects), en | 1.5B nominal (safetensors 2.26B) | MIT | robust to quiet/whispered speech; Transformers `GlmAsr`, vLLM >= 0.14.1 | https://huggingface.co/zai-org/GLM-ASR-Nano-2512 | V |
| Voxtral Mini (3B) / Small (24B) | Mistral | 2025-07 | LLM (Whisper-style encoder + Ministral/Mistral Small) | No | ~8 major languages | 3B / 24B | Apache-2.0 | Q&A and summary over audio, 30-40 min context | https://huggingface.co/mistralai/Voxtral-Mini-3B-2507 | U |
| Voxtral-Mini-4B-Realtime-2602 | Mistral | 2026-02-04 (HF repo created 2026-01-21) | LLM, streaming | Yes (configurable latency down to <200 ms; within 1-2% WER at 480 ms) | 13 | ~4B | Apache-2.0 | cannot be used together with diarization | https://docs.mistral.ai/capabilities/audio/speech_to_text | V |
| Omnilingual ASR (omniASR CTC / LLM) | Meta FAIR | 2025-11 | wav2vec2 SSL + CTC, or + LLM decoder | No | 1,600+ (sources say 1,600-1,672) | 300M / 1B / 3B / 7B | Apache-2.0 (corpus CC-BY-4.0) | zero-shot in-context for new languages | https://arxiv.org/abs/2511.09690 | V |
| Granite-speech-3.3-8B | IBM | 2025-06-19 (rev 3.3.2 adds fr/de/es/pt) | LLM, two-pass (conformer + Granite 3.3 8B LoRA) | No | en (+fr, de, es, pt) | ~8B | Apache-2.0 | ASR + AST; was briefly #1 on Open ASR LB; 2B variant exists (U) | https://huggingface.co/ibm-granite/granite-speech-3.3-8b | V |
| VibeVoice-ASR | Microsoft | 2026-01 (~01-21) | LLM | No | 51 language tags on HF card | ~8.7B (safetensors) | MIT | 60-min single pass; ASR + diarization + timestamps in one output; hotwords; BitNet CPU variant | https://huggingface.co/microsoft/VibeVoice-ASR | V |
| Phi-4-multimodal-instruct | Microsoft | 2025-02 | LLM (speech LoRA on Phi-4-mini) | No | 8 speech languages incl. zh | 5.6B | MIT | briefly #1 on Open ASR LB | https://huggingface.co/microsoft/Phi-4-multimodal-instruct | U |
| Moonshine (v1: tiny / base) | Useful Sensors | 2024-10 | AED, variable-length encoder (no 30 s padding) | No | en (+ later per-language "flavors") | 27M / 61M | MIT | edge / CPU | https://github.com/moonshine-ai/moonshine | U |
| Moonshine Voice (v2, streaming) | Moonshine AI (ex-Useful Sensors) | 2026-02-13 | Streaming AED | Yes | en | Tiny 34M ... Medium 245M | MIT | Medium: 6.65% Open ASR LB WER vs 7.44% for Whisper large-v3 (vendor claim) | https://petewarden.com/2026/02/13/announcing-moonshine-voice/ | V |
| Dolphin (base / small); Dolphin-CN-Dialect (2026-05-09, incl. base.streaming / small.streaming / small.prompt, arXiv 2605.08961) | DataoceanAI + Tsinghua | 2025-03; CN-Dialect 2026-05 | CTC-attention hybrid (E-Branchformer), Whisper-like | No (v1); streaming variants in CN-Dialect | 40 Eastern languages + 22 Chinese dialects | 0.1B / 0.4B open; 6 of 8 models public | Apache-2.0 | LID, VAD/segmentation, word timestamps (2026-05) | https://github.com/DataoceanAI/Dolphin | V |
| Zipformer (k2 / icefall / sherpa-onnx) | Xiaomi Next-gen Kaldi | 2023 (ICLR 2024) | Transducer (pruned RNN-T) + CTC | Yes (streaming and offline variants) | per recipe (zh, en, many) | ~20-150M typical | Apache-2.0 | the edge/embedded deployment baseline | https://github.com/k2-fsa/icefall | U |

## 3. Hugging Face Open ASR Leaderboard

- What it measures: WER (normalized) and RTFx (audio seconds / compute seconds, i.e. inverse RTF; higher is faster). Main English short-form average uses ~8 sets: AMI, Earnings22, GigaSpeech, LibriSpeech clean + other, SPGISpeech, TED-LIUM, VoxPopuli (dataset list U for the current version; repo confirms the hf-audio/open-asr-leaderboard data).
- Tracks (V, repo README): English short-form; English long-form (Earnings21, Earnings22, CORAAL, plus a chunked Earnings22 variant); multilingual (FLEURS, MCV, MLS, plus Hindi and Armenian additions); private held-out sets evaluated by the maintainers.
- Paper (V): arXiv 2510.06961, "Open ASR Leaderboard: Towards Reproducible and Transparent Multilingual and Long-Form Speech Recognition Evaluation". https://arxiv.org/abs/2510.06961
- Current top entries: the Space would not render through fetch, so the rankings are UNVERIFIED. The repo's example runs name parakeet-tdt-0.6b-v3, whisper-large-v3-turbo and Qwen3-ASR-1.7B. Historically the #1 spot changed hands: Phi-4-MM, Parakeet-v2, Granite-speech-3.3-8B, Canary-Qwen-2.5B (2025). Leaders are LLM-based (Canary-Qwen, Granite) at low RTFx; TDT/CTC models (Parakeet) top the speed axis by orders of magnitude.
- Source: https://github.com/huggingface/open_asr_leaderboard

## 4. Surprises / common misstatements

1. Qwen3-ASR is not API-only any more. Qwen3-ASR-Flash was the API product (2025). In 2026-01 Qwen released open weights for the 1.7B and 0.6B models plus a separate Qwen3-ForcedAligner-0.6B for timestamps.
2. FireRedASR2 exists (2026-02). It ships as the FireRedASR2S suite (ASR-AED, ASR-LLM, VAD, punctuation) under Apache-2.0. Do not describe FireRedASR as only the 2025-01 v1.
3. Fun-ASR (full) is a Tongyi API model. The open release is Fun-ASR-Nano-2512 (~800M, LLM-based), with an MLT-Nano sibling for 31 languages. Sources disagree on which checkpoint covers 31 languages.
4. Parakeet-TDT-0.6B-v3 covers 25 European languages and no Chinese. Canary-Qwen-2.5B is English-only. Both are CC-BY-4.0 (attribution required), not Apache.
5. "Voxtral Transcribe 2" (2026-02) is two models: Mini Transcribe V2 (batch, API, with diarization, context biasing and timestamps) and Mini Transcribe Realtime (open weights, Apache-2.0, ~4B). Realtime cannot be combined with diarization.
6. OpenAI's newest transcription model found is gpt-4o-transcribe-diarize (2025-10). It is not in the Realtime API, and early users reported lower accuracy than gpt-4o-transcribe. No 2026 OpenAI transcription model was found (UNVERIFIED absence).
7. Moonshine v2 ("Moonshine Voice", 2026-02) is a streaming family. Its 245M Medium model claims a lower Open ASR LB WER than Whisper large-v3 (vendor claim).
8. Whisper large-v3-turbo is a pruned-decoder distillation (809M), not "large-v3 quantized". Its translation is weaker.
9. On the leaderboard, RTFx is inverse RTF (bigger is faster). The headline WER is English-only; multilingual and long-form are separate tracks.
10. Meta Omnilingual ASR's "5,400+ languages" figure is zero-shot marketing. The trained coverage is 1,600+.


---

# Topic B: Speaker technology (as of 2026-10-28)

Verified = fetched from the primary page this session. Anything else is marked UNVERIFIED.

## 1. Speaker verification / embeddings

| Model / toolkit | Org | Year | Architecture | Params | Vox1-O EER | License | Source |
|---|---|---|---|---|---|---|---|
| ECAPA-TDNN | Ghent Univ. (Desplanques et al.) | 2020 (Interspeech) | TDNN + SE-Res2Blocks + multi-layer aggregation + attentive stats pooling | 20.8M (3D-Speaker impl.); 14.66M (CAM++ paper re-impl.) | 0.86% (3D-Speaker); 0.89% (CAM++ paper) | — | arXiv 2005.07143 (paper not re-fetched this session: UNVERIFIED); https://github.com/modelscope/3D-Speaker |
| CAM++ | Alibaba Tongyi (3D-Speaker) | 2023 (arXiv 2303.00332, Interspeech 2023) | D-TDNN + context-aware masking + front-end 2D conv | 7.18M (paper); 7.2M (repo) | 0.73% (paper); 0.65% (repo, VoxCeleb-trained) | Apache-2.0 (repo) | https://arxiv.org/abs/2303.00332 ; https://github.com/modelscope/3D-Speaker |
| ERes2Net base / large | Alibaba (3D-Speaker) | 2023 | Res2Net with local + global feature fusion | 6.61M / 22.46M | 0.84% / 0.52% | Apache-2.0 | https://github.com/modelscope/3D-Speaker |
| ERes2NetV2 | Alibaba (3D-Speaker) | 2024 (models released 2024.8) | ERes2Net with wider/shorter design | 17.8M | 0.61% | Apache-2.0 | https://github.com/modelscope/3D-Speaker |
| ResNet34 (3D-Speaker) | Alibaba | 2024.1 recipe | ResNet34 | 6.34M | 1.05% | Apache-2.0 | https://github.com/modelscope/3D-Speaker |
| 3D-Speaker toolkit | Alibaba / ModelScope | toolkit paper 2024 (arXiv 2403.19971); latest README news 2024.12 (diarization recipe update) | SV + multimodal diarization | — | — | Apache-2.0 | https://github.com/modelscope/3D-Speaker ; https://arxiv.org/abs/2403.19971 |
| WeSpeaker toolkit | WeNet community | ongoing; latest news 2026-09-22 (U³-xi uncertainty-aware embedding); 2026-07-03 ReDimNet2+TFMel; 2026-06-15 HAM-Softmax; 2025-12-05 w2v-BERT2; 2025-02-23 xi-vector. Release-tag number not checked (UNVERIFIED) | ResNet / ECAPA / CAM++ / ReDimNet / w2v-BERT2 / SSL | — | ResNet34 0.723%, ECAPA_GLOB_c1024 0.728%, ResNet293 0.447% (vox1-O-clean, LM fine-tune + AS-Norm) | Apache-2.0 | https://github.com/wenet-e2e/wespeaker |
| ReDimNet (B0–B6) | IDR&D (Yakovlev et al.) | 2024 (arXiv 2407.18223, Interspeech 2024) | reshapes 2D<->1D feature maps between blocks | B0..B6 range (exact counts UNVERIFIED) | headline numbers not fetched (UNVERIFIED) | UNVERIFIED | https://arxiv.org/abs/2407.18223 |
| ReDimNet2 / w2v-BERT2 SV | via WeSpeaker | 2026 / 2025 | see above | UNVERIFIED | UNVERIFIED | Apache-2.0 (toolkit) | https://github.com/wenet-e2e/wespeaker |

Note: EERs differ by protocol (cleaned trial list, AS-Norm, large-margin fine-tuning). Compare numbers only when they come from the same table.

## 2. Speaker diarization

| System | Org | Release | Key facts | DER (source-stated) | License | Source |
|---|---|---|---|---|---|---|
| pyannote.audio 4.x | pyannote / pyannoteAI | 4.0 shipped with community-1 (Sept 2025, per blog); **latest 4.0.7 = 2026-06-30** (4.0.6 yanked) | Python >=3.10 | — | MIT for code (from memory, UNVERIFIED on PyPI page) | https://pypi.org/project/pyannote-audio/ |
| speaker-diarization-community-1 | pyannoteAI | Sept 2025 | open weights, HF gated (accept conditions + token); "exclusive" (non-overlap) output mode | AMI-IHM 17.0, AMI-SDM 19.9, DIHARD3 20.2, VoxConverse 11.2, CALLHOME 26.7 | HF gated; CC-BY-4.0 (HF tag, verified) | https://pyannote.ai/blog/community-1 ; https://pypi.org/project/pyannote-audio/ |
| speaker-diarization-3.1 (legacy) | pyannote | 2023 (UNVERIFIED date) | pure PyTorch, no onnxruntime | AMI-IHM 18.8, DIHARD3 21.4, VoxConverse 11.2 | MIT (UNVERIFIED) | https://pypi.org/project/pyannote-audio/ |
| precision-2 (commercial) | pyannoteAI | 2025 | API default; voiceprints / speaker ID only on precision-2; vendor says ~28% more accurate than community-1 | VoxConverse 8.5, AMI-IHM 12.9 (vendor) | commercial | https://docs.pyannote.ai/models |
| Sortformer diar_sortformer_4spk-v1 | NVIDIA NeMo | HF repo 2024-12-09 (arXiv 2409.06656) | offline end-to-end, Sort Loss, max 4 spk | not fetched | CC-BY-NC-4.0 (HF tag, verified) | https://huggingface.co/nvidia/diar_sortformer_4spk-v1 |
| Streaming Sortformer diar_streaming_sortformer_4spk-v2 / **v2.1** | NVIDIA | 2025 (date not on card) | 117M params, max 4 spk (degrades at >=5), Arrival-Order Speaker Cache; latency 30.4 s or 1.04 s | v2.1 @30.4s: DIHARD3 19.49, CALLHOME-p2 10.10, AMI-IHM 15.90, AliMeeting 11.73, NOTSOFAR1 27.07 | NVIDIA Open Model License | https://huggingface.co/nvidia/diar_streaming_sortformer_4spk-v2.1 |
| **Nemotron-3-Diarization** (`nvidia/Nemotron-3-Diarization`) | NVIDIA | **2026-09-23** announced (HF repo created 2026-09-01); card: "supports both streaming and offline inference and handles up to eight speakers" | ~100M (99.2M), **up to 8 speakers**, streaming + offline, Sortformer-based (31-layer Transformer, RoPE, AOSC + FIFO); latency 80 ms – 30.4 s, recommended min 0.32 s; transformers v5.18 support | @30.4s: DIHARD3 12.73, CALLHOME-p2 9.10, AliMeeting 6.40, AMI-MHM 9.25, NOTSOFAR1 6.77 (forced-alignment refs for AMI/AliMeeting/NOTSOFAR -> not comparable to other tables) | **OpenMDW 1.1** (commercial OK) | https://huggingface.co/nvidia/Nemotron-3-Diarization |
| multitalker-parakeet-streaming-0.6b-v1 | NVIDIA | date not found (UNVERIFIED) | streaming multi-talker ASR on Nemotron-Speech-Streaming / FastConformer; one instance per speaker, conditioned via learnable "speaker kernels" on Sortformer v2.1 activity; no enrollment needed | — | NVIDIA Open Model License | https://huggingface.co/nvidia/multitalker-parakeet-streaming-0.6b-v1 |
| DiariZen (Base-s80, Large-s80, Large-s80-v2) | BUT Speech@FIT | v2 benchmarks 2025-12-09; multi-channel 2026-01-31 | WavLM (pruned) + Conformer EEND local + pyannote-style clustering | Large-s80-v2 (no collar): AMI-SDM 13.9, DIHARD3 14.5, VoxConverse 9.1, AliMeeting-far 10.8, NOTSOFAR1 16.7 | code MIT; **weights CC BY-NC 4.0 (research only)** | https://github.com/BUTSpeechFIT/DiariZen |
| 3D-Speaker diarization | Alibaba | 2024.12 update | VAD + overlap det. + embedding + clustering; audio-visual recipes | Aishell-4 10.30, Meeting-CN_ZH-1 18.91 (best on those; not on AMI/VoxConverse) | Apache-2.0 | https://github.com/modelscope/3D-Speaker |
| WeSpeaker diarization | WeNet | ongoing | `--task diarization` / `model.diarize()`; UMAP+HDBSCAN; VoxConverse recipe | not fetched | Apache-2.0 | https://github.com/wenet-e2e/wespeaker |

## 3. DER metric

- DER = (false alarm + missed detection + speaker confusion) / total reference speech, where total = sum over speakers of reference speech duration (so overlapped speech is counted once per speaker). Source: https://pyannote.github.io/pyannote-metrics/reference.html
- pyannote.metrics defaults: `collar=0.0`, `skip_overlap=False` (overlap is scored). The docs note a 0.5 s collar (0.25 s each side) is common in older research.
- Older NIST RT practice: 0.25 s collar, overlap often excluded; DIHARD II/III eval plans: no collar, overlap scored (UNVERIFIED: eval plan not fetched this session).
- Always state collar + overlap setting with any DER; DiariZen and pyannote tables are no-collar, overlap-included.

## 4. Target-speaker ASR (TS-ASR)

| Item | Facts | Source |
|---|---|---|
| Concept | Transcribe only the target speaker in a mixture, conditioned on enrollment speech / speaker embedding (or on diarization activity) | review-level; e.g. SpeakerBeam lineage (Delcroix/Žmolíková) UNVERIFIED |
| SOT | Serialized Output Training (Kanda et al., Microsoft, 2020): one decoder emits all speakers' transcripts serialized by start time with speaker-change token; no enrollment; t-SOT is the streaming variant | arXiv 2003.12687 (UNVERIFIED fetch) |
| Relation | Multi-talker ASR = all speakers (SOT/PIT); TS-ASR = one chosen speaker; speaker-attributed ASR = all + who. Diarization-conditioned TS-ASR blurs the line: NVIDIA multitalker-parakeet is "target speaker per instance" but driven by diarization, not enrollment | https://huggingface.co/nvidia/multitalker-parakeet-streaming-0.6b-v1 |
| Open models | NVIDIA multitalker-parakeet-streaming-0.6b-v1 (open); others (DiCoW from BUT, diarization-conditioned Whisper) UNVERIFIED | above |

## Surprises / common misstatements

1. NVIDIA's diarization flagship is now **Nemotron-3-Diarization** (2026-09-23): 8 speakers, streaming, ~100M, OpenMDW 1.1. Streaming Sortformer v2/v2.1 is still **4 speakers**, 117M.
2. pyannote.audio is on **4.0.7 (2026-06-30)**. 3.1 is legacy; community-1 beats it on 10 of 12 benchmarks, ties on VoxConverse (11.2) and is worse on REPERE.
3. DiariZen's code is MIT but its **weights are CC BY-NC 4.0**, so "open-source" does not mean usable commercially.
4. Nemotron-3 DER on AMI, AliMeeting and NOTSOFAR uses forced-alignment references, so it cannot be compared directly with DiariZen or pyannote tables. DER without collar and overlap settings means little.
5. CAM++ is quoted as 0.73% (paper) or 0.65% (repo). WeSpeaker now ships ReDimNet2 and w2v-BERT2 models. NVIDIA's multitalker-parakeet ASR needs **no enrollment**: it takes Sortformer output instead.


---

# Topic C: sherpa-onnx (checked 2026-10-28)

Repo: https://github.com/k2-fsa/sherpa-onnx. Source paths below are relative to `blob/master/`.

## 1. Release
| Item | Value | Source |
|---|---|---|
| Latest | **v2.0.1**, 2026-10-26 | `gh release list` / CHANGELOG.md |
| Previous | v2.0.0 (2026-10-23), v1.13.8 (2026-09-10) | same |
| What's new in 2.0.1 | VoxLock target-speaker voice isolation in the speech denoisers, with APIs for every binding; Canary greedy-search fix; Dart `createAsync` | CHANGELOG.md |

## 2. ASR model families
| Family | Offline | Streaming | Source |
|---|---|---|---|
| Zipformer/Conformer/LSTM/E-Branchformer transducer | yes | yes | csrc/offline-transducer-model.h, online-zipformer2-transducer-model.h |
| Zipformer CTC | yes | yes (zipformer2-ctc) | csrc/offline-zipformer-ctc-model.h, online-zipformer2-ctc-model.h |
| Paraformer | yes | yes | csrc/offline-paraformer-model.h, online-paraformer-model.h |
| SenseVoice | yes | no | csrc/offline-sense-voice-model.h |
| Whisper | yes | no | csrc/offline-whisper-model.h |
| Moonshine v1 and **v2** (v2 = encoder + merged_decoder) | yes | no | csrc/offline-moonshine-model-config.h |
| NeMo Parakeet TDT/transducer | yes | yes (online-transducer-nemo, parakeet-unified-en-0.6b) | csrc/offline-transducer-nemo-model.h, online-transducer-nemo-parakeet-unified-model.h |
| NeMo CTC (Parakeet CTC) | yes | yes | csrc/offline-nemo-enc-dec-ctc-model.h, online-nemo-ctc-model.h |
| NeMo Canary | yes | no | csrc/offline-canary-model.h |
| Qwen3-ASR | yes | no (VAD and simulated streaming only) | csrc/offline-qwen3-asr-model.h |
| FireRedASR AED | yes | no | csrc/offline-fire-red-asr-model.h |
| FireRedASR **CTC** (incl. FireRedASR2 CTC, #3220/#3221) | yes | no | csrc/offline-fire-red-asr-ctc-model.h |
| FireRedASR-LLM | not found | - | UNVERIFIED / no source file |
| Dolphin | yes | no | csrc/offline-dolphin-model.h |
| FunASR-nano (Fun-ASR-Nano) | yes | no | csrc/offline-funasr-nano-model.h |
| Omnilingual ASR (CTC) | yes | no | csrc/offline-omnilingual-asr-ctc-model.h |
| Google MedASR (CTC) | yes | no | csrc/offline-medasr-ctc-model.h |
| Cohere Transcribe (cohere-transcribe-03-2026) | yes | no | csrc/offline-cohere-transcribe-model.h |
| WeNet CTC | yes | yes | csrc/offline-wenet-ctc-model.h, online-wenet-ctc-model.h |
| TeleSpeech CTC | yes | no | csrc/offline-telespeech-ctc-model.h |
| T-one CTC (Russian) | no | yes | csrc/online-t-one-ctc-model.h |
| GigaAM v2/v3 (Russian) | yes, through the NeMo CTC/transducer paths | no | CHANGELOG #2901, #2423 |
| TDNN CTC (yesno) | yes | no | csrc/offline-tdnn-ctc-model.h |
| Doubao ASR | **cloud API, not a local model**: example scripts only | - | python-api-examples/generate-subtitles-doubao.py |

Docs index: https://k2-fsa.github.io/sherpa/onnx/pretrained_models/index.html

## 3. Hotwords / contextual biasing
- The docs still say: "Only transducer models support hotwords in sherpa-onnx… All other models don't support hotwords." They also say hotwords work only with "the modified_beam_search decoding method of the transducer models". Source: https://k2-fsa.github.io/sherpa/onnx/hotwords/index.html
- **The docs are out of date.** Source and CHANGELOG show:
  - **Qwen3-ASR has hotwords.** See #3434 "Add hotwords support for Qwen3-ASR" and #3468, where `hotwords` was added to OfflineQwen3ASRModelConfig. Qwen3-ASR also takes a per-stream language hint (#3472). This works by prompting the LLM, not through a context graph.
  - **FunASR-nano has prompts.** Its config has `system_prompt` and `user_prompt` ("语音转写："), and per-stream prompt options were added in #4012. This is prompt biasing.
  - **Streaming NeMo transducer models** got modified_beam_search with hotwords (#3895).
- Transducer hotwords use `context-graph.h` (Aho-Corasick). I found no SeACo-Paraformer hotword support: the Paraformer config has no hotword field.

## 4. VAD
| Item | Status | Source |
|---|---|---|
| Silero VAD | yes | csrc/silero-vad-model.h |
| **TEN-VAD** | yes, since #2377 (C++/Python) and #2379 (C API). Supported across bindings, with Rust, Dart and .NET examples; `--ten-vad-model` is a drop-in replacement for `--silero-vad-model` | csrc/ten-vad-model.h; dart-api-examples/vad/bin/ten-vad.dart |
| VAD fix in 2.0.0 | sample positions widened to int64 (long-stream SIGSEGV) | CHANGELOG #4079 |

## 5. Speaker diarization / ID
- **Diarization: offline only.** The pipeline is pyannote segmentation (segmentation-3.0) plus a speaker embedding extractor (3D-Speaker, WeSpeaker or NeMo models) plus clustering, either fast clustering or a cluster threshold. The only implementation is `offline-speaker-diarization-pyannote-impl.h`, and there is no online diarization file. Per-segment confidence was added in #3881. Source: csrc/offline-speaker-diarization*.h
- **Sortformer: not present.** No path in the master tree matches "sortformer" (re-checked via `gh api .../git/trees/master?recursive=1`, 0 hits).
- **Speaker ID/verification:** `SpeakerEmbeddingExtractor` plus `SpeakerEmbeddingManager` (register, search, verify, and `GetEmbedding` from #3950). Bindings include Swift and Rust. Source: csrc/speaker-embedding-manager.h
- **VoxLock (2.0.1):** target-speaker voice isolation, offline and online (`online-speech-denoiser-voxlock-impl.h`).

## 6. Other
- **Bindings:** C, C++, Python, Java, Kotlin, Swift, Go, Rust, C#, Dart/Flutter, JavaScript (node-addon and WASM), Pascal/Lazarus. That is roughly 12 languages. Platforms: Android, iOS, HarmonyOS, Tauri desktop, WebSocket.
- **NPUs:** RKNN, Ascend (.om), and Qualcomm QNN (Parakeet, Moonshine).
- **TTS:** VITS (Piper and others), Matcha, Kokoro, Kitten (v0.8), ZipVoice, Pocket, Supertonic.
- **Also included:** keyword spotting; punctuation (CT-Transformer and CNN-BiLSTM); audio tagging (CED and Zipformer); spoken language ID; speech denoising (GTCRN, DPDFNet, VoxLock); source separation (Spleeter, UVR).

## Surprises / common misstatements
1. "Hotwords only for transducers" is no longer true. Qwen3-ASR has a `hotwords` config and FunASR-nano has prompts, even though the hotwords doc page still says transducer-only.
2. The version is **2.0.x** (Oct 2026), not 1.12/1.13.
3. FireRedASR support is the AED model plus CTC models (FireRedASR2 CTC). I found no FireRedASR-LLM runtime.
4. Streaming exists for transducer, Zipformer2-CTC, Paraformer, WeNet, NeMo CTC/TDT (Parakeet Unified) and T-one. All the LLM-style models (Qwen3, FunASR-nano, Canary, Whisper, Moonshine, Cohere) are offline only.
5. Diarization is offline only, with no Sortformer. Doubao is a cloud API example, not a bundled model.
