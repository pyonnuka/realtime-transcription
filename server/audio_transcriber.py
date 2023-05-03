import asyncio
import queue
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import websockets

from vad_utils import VadWrapper
from whisper_utils import WhisperModelWrapper

class AudioTranscriber:
    def __init__(self):
        self.model_wrapper = WhisperModelWrapper()
        self.vad_wrapper = VadWrapper()
        self.silent_chunks = 0
        self.speech_buffer = []
        self.audio_queue = queue.Queue()

    async def transcribe_audio(self):
        with ThreadPoolExecutor() as executor:
            while True:
                audio_data_np = await asyncio.get_event_loop().run_in_executor(
                    executor, self.audio_queue.get
                )
                segments = await asyncio.get_event_loop().run_in_executor(
                    executor, self.model_wrapper.transcribe, audio_data_np
                )

                for segment in segments:
                    print(segment.text)

    async def process_audio(self, websocket, path):
        print('get from websocket')
        async for message in websocket:
            audio_data = np.frombuffer(message, dtype=np.int16)
            is_speech = self.vad_wrapper.is_speech(audio_data.tobytes())

            if is_speech:
                self.silent_chunks = 0
                self.speech_buffer.append(audio_data)
            else:
                self.silent_chunks += 1

            if (
                not is_speech
                and self.silent_chunks > self.vad_wrapper.SILENT_CHUNKS_THRESHOLD
            ):
                if len(self.speech_buffer) > 20:
                    audio_data_np = np.concatenate(self.speech_buffer)
                    self.speech_buffer.clear()
                    self.audio_queue.put(audio_data_np)
                else:
                    # noise clear
                    self.speech_buffer.clear()

    async def start_transcription(self):
        print("Listening...")
        async with websockets.serve(self.process_audio, "0.0.0.0", 8080):
            await self.transcribe_audio()
