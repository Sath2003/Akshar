# Audio Workflow

## Overview

Lesson audio is **pre-generated offline** by content creators and uploaded to S3 after human review. The Fastify backend does not call any TTS API at runtime.

```
Content text
   ↓
voice-tools/ (offline)
Azure Speech SDK
   ↓
Local MP3 output
   ↓
Human review (listen and approve)
   ↓
Upload to S3
   ↓
Add asset ID to audio-repository.js
   ↓
Backend serves signed S3 URL via GET /api/v1/audio/:assetId
```

---

## Audio Asset Route

```
GET /api/v1/audio/:assetId
```

Returns a short-lived signed S3 URL. The client plays audio from this URL directly.

### Example

```bash
GET /api/v1/audio/feedback-great-job-en

200 OK
{
  "url": "https://your-bucket.s3.ap-south-1.amazonaws.com/audio/feedback/en/great-job.mp3?X-Amz-...",
  "expiresIn": 900
}
```

### Security

- Client sends only an asset ID (e.g. `feedback-great-job-en`)
- Server validates the ID against an approved allowlist (`audio-repository.js`)
- No arbitrary S3 keys or paths accepted from the client
- URL signed with EC2 IAM role (no static AWS credentials)
- URL expires in 900 seconds by default

---

## Voice Tools (Offline Admin Tool)

Location: `voice-tools/`

### Setup

```bash
cd voice-tools
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to .env
```

### Generate Audio

```bash
python scripts/generate_batch.py \
  --manifest manifests/sample-lessons.json \
  --provider azure
```

### Validate Audio

```bash
python scripts/validate_audio.py --dir output/
```

### Upload to S3

```bash
python scripts/upload_to_s3.py --dir output/ --bucket your-bucket --prefix audio/
```

---

## Adding a New Audio Asset

1. Add the text to a manifest JSON file in `voice-tools/manifests/`
2. Generate: `python scripts/generate_batch.py --manifest ...`
3. Listen to the output and approve
4. Upload to S3: `python scripts/upload_to_s3.py ...`
5. Add the asset to `backend/src/services/audio/audio-repository.js`:
   ```js
   ['my-new-asset-en', { s3Key: 'audio/my-new-asset.mp3', description: 'My new phrase' }],
   ```
6. Deploy the backend

---

## Supported Audio Categories

| Category           | S3 Prefix                    |
|--------------------|------------------------------|
| Positive feedback  | `audio/feedback/`            |
| English alphabet   | `audio/alphabet/en/`         |
| Hindi varnamala    | `audio/alphabet/hi/`         |
| Kannada varnamala  | `audio/alphabet/kn/`         |
| Numbers            | `audio/numbers/`             |
| Vocabulary         | `audio/vocabulary/`          |
| Lesson instructions| `audio/instructions/`        |

---

## Voices Configuration

Configure in `voice-tools/config/voices.yaml` (copy from `voices.example.yaml`):

```yaml
en:
  voice: en-IN-NeerjaNeural     # Azure voice for English India
  rate: 0.85
  pitch: "+0Hz"
  format: audio-16khz-32kbitrate-mono-mp3

hi:
  voice: hi-IN-SwaraNeural
  rate: 0.85
  pitch: "+0Hz"
  format: audio-16khz-32kbitrate-mono-mp3

kn:
  voice: kn-IN-SapnaNeural
  rate: 0.85
  pitch: "+0Hz"
  format: audio-16khz-32kbitrate-mono-mp3
```

---

## AWS IAM Policy

The EC2 instance IAM role requires:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::your-bucket/audio/*"
}
```

The content-creator uploading audio needs:

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject"],
  "Resource": "arn:aws:s3:::your-bucket/audio/*"
}
```
