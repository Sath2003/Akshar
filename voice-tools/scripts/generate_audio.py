import argparse
from providers import MockVoiceProvider

def main():
    parser = argparse.ArgumentParser(description="Generate audio for a single text string.")
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--language", default="en", help="Language code")
    parser.add_argument("--voice-id", default="mock-voice-1", help="Voice ID")
    parser.add_argument("--rate", type=float, default=0.88, help="Speaking rate")
    parser.add_argument("--output", required=True, help="Output file path")

    args = parser.parse_args()

    provider = MockVoiceProvider()
    provider.synthesize(args.text, args.language, args.voice_id, args.rate, args.output)
    print(f"Generated {args.output}")

if __name__ == "__main__":
    main()
