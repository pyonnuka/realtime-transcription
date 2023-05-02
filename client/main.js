// グローバル変数
let audioContext;
let mediaStreamSource;
let audioProcessor;
let socket;
let isRecording = false;

// WebSocketの接続を確立
function setupWebSocket() {
    socket = new WebSocket('ws://localhost:8000');

    socket.addEventListener('open', (event) => {
        console.log('WebSocket接続が開かれました。', event);
        socket.send('Hello, WebSocket Server!');
    });

    socket.addEventListener('message', (event) => {
        console.log('サーバーからメッセージが受信されました。', event.data);

        const speakerResults = JSON.parse(event.data);
        const transcription = document.getElementById('transcription');

        speakerResults.forEach(result => {
            transcription.innerHTML += `<p>Speaker ${result.speaker}: ${result.transcription}</p>`;
        });
    });
}

// 音声データのストリーミングを開始
function startRecording(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    audioProcessor.onaudioprocess = (event) => {
        if (!isRecording) return;

        const inputBuffer = event.inputBuffer;
        const audioData = new Int16Array(inputBuffer.length);

        for (let i = 0; i < inputBuffer.length; i++) {
            audioData[i] = inputBuffer.getChannelData(0)[i] * 32767;
        }

        console.log('音声データを送信しました。')
        socket.send(audioData.buffer);
    };

    mediaStreamSource.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);
}

// マイクのアクセスを取得
function getMicrophoneAccess() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
            startRecording(stream);
        })
        .catch((err) => {
            console.error('マイクへのアクセスが許可されていません。', err);
        });
}

// マイクの起動と停止を制御する関数
function toggleRecording() {
    const button = document.getElementById('start-stop');

    if (isRecording) {
        button.textContent = 'マイクを起動';
        isRecording = false;
    } else {
        button.textContent = 'マイクを停止';
        isRecording = true;
    }
}

// ボタンのクリックイベントを設定
document.getElementById('start-stop').addEventListener('click', toggleRecording);

// WebSocketをセットアップし、マイクへのアクセスを試行
setupWebSocket();
getMicrophoneAccess();
