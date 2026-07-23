from typing import List, Dict

class VoiceProvider:
    def list_voices(self, language: str) -> List[Dict]:
        raise NotImplementedError

    def synthesize(
        self,
        text: str,
        language: str,
        voice_id: str,
        speaking_rate: float,
        output_path: str,
    ) -> str:
        raise NotImplementedError

class MockVoiceProvider(VoiceProvider):
    def list_voices(self, language: str) -> List[Dict]:
        return [
            {"voice_id": "mock-voice-1", "language": language, "gender": "female"},
            {"voice_id": "mock-voice-2", "language": language, "gender": "male"},
        ]

    def synthesize(
        self,
        text: str,
        language: str,
        voice_id: str,
        speaking_rate: float,
        output_path: str,
    ) -> str:
        # Mock generating audio
        with open(output_path, "wb") as f:
            f.write(f"MOCK AUDIO DATA\nText: '{text}'\nVoice: '{voice_id}'\nRate: {speaking_rate}".encode('utf-8'))
        return output_path
