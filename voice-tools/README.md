# Voice Generation Utilities

Python utilities for generating natural, child-friendly Indian-language audio for English, Hindi, and Kannada lessons.

This is an offline/administrator-controlled content-production tool for generating, processing, and validating audio files. It is not part of the main React/Fastify application stack and does not run in production Docker Compose.

## Strategy

We use a provider interface to abstract different text-to-speech services:

- `mock` (development)
- `azure` (Azure AI Speech) - Proposed production provider
- `google` (Google Cloud Text-to-Speech) - Optional comparison
- `local-indic` (AI4Bharat IndicF5) - Optional experimental

## Setup

```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
cp .env.example .env
cp config/voices.example.yaml config/voices.yaml
```

## Usage

Scripts are located in `scripts/`. These scripts are used manually to generate, validate, and upload audio.

Example:

```bash
python scripts/generate_batch.py --manifest manifests/sample-lessons.json --provider mock
```
