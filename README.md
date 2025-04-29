# RAG_Speech-to-Speech_Agent_Chaining

This project, nicknamed MailMaven is a real-time, voice-driven personal email assistant that listens to your spoken queries, retrieves relevant email context, and responds in your own cloned voice.
The system orchestrates five chained components-speech-to-text, keyword detection & prompt generation, retrieval-augmented QA, LLM response, and text-to-speech-to deliver seamless, context-aware email interactions.

This project was uses the structure laid out by \*_Developers Digest_'s repo linked [here](https://github.com/developersdigest/Create-Your-Own-Voice-Assistant-with-Node.js-Langchain-Eleven-Labs-in-9-Minutes)

## Features

_Features inherited from Developers Digest_

- **Wake‑word detection**: Listens continuously and only processes audio segments containing the keyword “maven.”
- **Speech‑to‑Text**: Uses OpenAI’s Whisper (`whisper-1`) to transcribe your voice.
- **Modular Design**: Allows for easy integration and extension of components.

_Added functionality (RAG + Voice Cloning)_

- **Retrieval‑Augmented QA**: Chains your query through a LangChain RAG pipeline (`ragChain`) for context‑aware responses.
- **Text‑to‑Speech**: Converts the assistant’s response to high‑quality speech via the Eleven Labs API. Eleven Labs was utilized to clone my voice with 5 minutes of high quality .wav files.
- **Seamless loop**: After each interaction, it automatically returns to listening mode.
- **Configurable audio playback**: Toggle playback on/off via an environment variable.

---

## Architecture

1. **Audio Capture**

   - `mic` records from your microphone.
   - On silence, chunks of audio are saved to WAV.

2. **Transcription**

   - Audio file is sent to OpenAI’s Whisper API.

3. **RAG Chain**

   - Transcription is checked for the wake‑word.
   - If detected, the text is passed to `ragChain` (see [`rag.js`](./rag.js)) which performs retrieval + LLM inference.
   - The

4. **Response Generation**

   - The RAG chain returns a `text` response from OpenAI.

5. **Text‑to‑Speech**

   - Response text is converted to MP3 via Eleven Labs.
   - Playback is handled by `sound-play`.

6. **Loop**
   - After playback (or skipping it), the system goes back to step 1.

---
