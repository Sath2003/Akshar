import argparse
from providers import MockVoiceProvider

def main():
    parser = argparse.ArgumentParser(description="List available voices.")
    parser.add_argument("--language", default="en-IN", help="Language code")
    args = parser.parse_args()

    provider = MockVoiceProvider()
    voices = provider.list_voices(args.language)
    for voice in voices:
        print(voice)

if __name__ == "__main__":
    main()
