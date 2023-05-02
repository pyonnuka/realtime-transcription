import asyncio
from audio_transcriber import AudioTranscriber

if __name__ == "__main__":
    transcriber = AudioTranscriber()
    asyncio.run(transcriber.start_transcription())
