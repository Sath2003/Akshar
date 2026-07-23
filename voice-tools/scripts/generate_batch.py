import argparse
import json
import os
from providers import MockVoiceProvider

def main():
    parser = argparse.ArgumentParser(description="Generate audio files from a JSON manifest.")
    parser.add_argument("--manifest", required=True, help="Path to the lesson JSON manifest")
    parser.add_argument("--provider", default="mock", help="Provider to use")
    
    args = parser.parse_args()

    with open(args.manifest, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    
    provider = MockVoiceProvider()
    
    language = manifest.get("language", "en")
    lesson_id = manifest.get("lessonId", "unknown")
    
    out_dir = os.path.join("audio", language, lesson_id)
    os.makedirs(out_dir, exist_ok=True)

    for segment in manifest.get("segments", []):
        output_file = os.path.join(out_dir, segment["outputFile"])
        text = segment["text"]
        print(f"Synthesizing: {text} -> {output_file}")
        
        provider.synthesize(
            text=text,
            language=language,
            voice_id="mock-voice-1",
            speaking_rate=0.88,
            output_path=output_file
        )
        
    print(f"Batch generation completed for {lesson_id}.")

if __name__ == "__main__":
    main()
