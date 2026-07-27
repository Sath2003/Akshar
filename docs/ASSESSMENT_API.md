# Assessment API

## Overview

The assessment endpoint grades a child's answer to a known question. The correct answer is never sent from the frontend — it is resolved server-side by question ID.

**Two grading strategies:**

| Strategy      | Used for                                           |
|---------------|----------------------------------------------------|
| Deterministic | Exact, tap, choice, number matching, alphabet matching |
| Gemini        | Open-ended language answers (when `AI_ENABLED=true`) |

---

## Endpoint

```
POST /api/v1/assess
Content-Type: application/json
```

### Request Body

```json
{
  "questionId": "numbers-en-05",
  "answer": "five",
  "language": "en",
  "gradeLevel": "lkg",
  "answerMode": "text"
}
```

| Field        | Type   | Values                          | Required |
|--------------|--------|---------------------------------|----------|
| `questionId` | string | lowercase alphanumeric + hyphens | ✅ |
| `answer`     | string | 1–500 characters                | ✅ |
| `language`   | enum   | `en`, `hi`, `kn`                | ✅ |
| `gradeLevel` | enum   | `nursery`, `lkg`, `ukg`         | ✅ |
| `answerMode` | enum   | `text`, `tap`                   | ✅ |

**The frontend must never send:**
- `correctAnswer`
- `score`
- `difficulty`
- Any Gemini prompt instructions

### Response (200 OK)

```json
{
  "correct": true,
  "score": 1.0,
  "feedback": "Great job! Five is correct.",
  "gradingMethod": "deterministic",
  "difficultyAdjustment": "increase",
  "reasonCode": "EXACT_MATCH"
}
```

| Field                 | Type    | Values                              |
|-----------------------|---------|-------------------------------------|
| `correct`             | boolean |                                     |
| `score`               | number  | 0.0–1.0                             |
| `feedback`            | string  | child-friendly, ≤200 chars          |
| `gradingMethod`       | enum    | `deterministic`, `gemini`           |
| `difficultyAdjustment`| enum    | `decrease`, `same`, `increase`      |
| `reasonCode`          | string  | See table below                     |

### Reason Codes

| Code                   | Meaning                                          |
|------------------------|--------------------------------------------------|
| `EXACT_MATCH`          | Normalized exact match                           |
| `ACCEPTED_ALTERNATIVE` | Matched an accepted alternative (e.g. "5" for "five") |
| `SPELLING_NEAR_MISS`   | 1 edit distance from correct (marked incorrect)  |
| `INCORRECT`            | Wrong answer                                     |
| `MEANING_MATCH`        | Gemini: correct meaning despite wording          |
| `SPELLING_VARIATION`   | Gemini: acceptable spelling variant              |
| `PARTIALLY_CORRECT`    | Gemini: partially correct response               |
| `SERVICE_UNAVAILABLE`  | Gemini failed; answer graded as incorrect        |

### Error Responses

| Status | Cause                          |
|--------|--------------------------------|
| 400    | Invalid request body           |
| 404    | Unknown `questionId`           |
| 429    | Rate limit exceeded            |
| 500    | Internal server error          |

---

## Security

- Rate-limited (global: 200 req/min; per-route: stricter limit applies)
- `additionalProperties: false` on both request and response
- Child's answer length capped at 500 characters
- Gemini prompt treats child's answer as **untrusted assessment content**
- No personal information sent to Gemini
- No child answers logged at info level

---

## Gemini Configuration

```env
AI_ENABLED=true
AI_PROVIDER=gemini
AI_MODEL=gemini-1.5-flash
GEMINI_API_KEY=your-key-here
AI_TIMEOUT_MS=10000
```

When `AI_ENABLED=false`, deterministic grading works normally. Open-ended questions return `SERVICE_UNAVAILABLE`.
