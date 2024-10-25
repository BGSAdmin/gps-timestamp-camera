const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const overlay = document.getElementById('overlay');
const takePhotoButton = document.getElementById('take-photo');
const startRecordButton = document.getElementById('start-record');
const stopRecordButton = document.getElementById('stop-record');
const pauseRecordButton = document.getElementById('pause-record');
const zoomRange = document.getElementById('zoom-range');
const productNameInput = document.getElementById('product-name');
const farmerNameInput = document.getElementById('farmer-name');
const logoInput = document.getElementById('logo-upload');
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let logoImage = null;
let canvasStream;
let overlayCanvas = document.createElement('canvas');

logoInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            logoImage = new Image();
            logoImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});


async function startCamera() {
    try {
        // Get both video and audio streams
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: {
                echoCancellation: true,  // Optional, to improve audio quality
                noiseSuppression: true,  // Optional, to reduce background noise
                sampleRate: 44100        // Optional, set sample rate for clear audio
            }
        });

        // Set the stream to the video element and mute it
        video.srcObject = stream;
        video.muted = true;  // Mute the sound so it's not heard during recording

        // Capture the canvas video stream
        canvasStream = overlayCanvas.captureStream(30);  

        // Combine video from the canvas and audio from the stream
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...stream.getAudioTracks()  // Include audio in the recorded video
        ]);

        // Set the mimeType for better audio and video quality
        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp8,opus' });

        mediaRecorder.ondataavailable = function (event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = saveVideo;

    } catch (err) {
        console.error("Error accessing the camera: ", err);
    }
}


function downloadData(url, fileName) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
}

function saveVideo() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const videoElement = document.createElement('video');
    videoElement.controls = true;
    videoElement.src = url;
    document.getElementById('result').appendChild(videoElement);
    downloadData(url, 'video_recording.webm'); 
    recordedChunks = [];
}

takePhotoButton.addEventListener('click', async function () {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const productName = productNameInput.value || "Product Name";
    const farmerName = farmerNameInput.value || "Farmer Name";

    const position = await getLocation();
    const timestamp = new Date().toLocaleString();
    context.font = '20px Arial';
    context.fillStyle = 'white';
    context.fillText(`Product: ${productName}`, 10, 30);
    context.fillText(`Farmer: ${farmerName}`, 10, 60);
    context.fillText(`Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`, 10, 90);
    context.fillText(`Timestamp: ${timestamp}`, 10, 120);

    if (logoImage) {
        const logoWidth = 100;
        const logoHeight = 100;
        context.drawImage(logoImage, canvas.width - logoWidth - 10, canvas.height - logoHeight - 10, logoWidth, logoHeight);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = dataUrl;
    document.getElementById('result').appendChild(img);

    downloadData(dataUrl, 'captured_image.png'); // Automatically download the image
});

startRecordButton.addEventListener('click', async function () {
    const context = overlayCanvas.getContext('2d');
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    mediaRecorder.start();
    isRecording = true;
    startRecordButton.style.display = 'none';
    stopRecordButton.style.display = 'inline';
    pauseRecordButton.style.display = 'inline';

    function drawOverlay() {
        if (!isRecording) return;

        context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        context.drawImage(video, 0, 0, overlayCanvas.width, overlayCanvas.height);

        const productName = productNameInput.value || "Product Name";
        const farmerName = farmerNameInput.value || "Farmer Name";

        context.font = '20px Arial';
        context.fillStyle = 'white';
        const position = {
            coords: { latitude: 12.9716, longitude: 77.5946 }  
        };
        const timestamp = new Date().toLocaleString();
        context.fillText(`Product: ${productName}`, 10, 30);
        context.fillText(`Farmer: ${farmerName}`, 10, 60);
        context.fillText(`Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`, 10, 90);
        context.fillText(`Timestamp: ${timestamp}`, 10, 120);

        if (logoImage) {
            const logoWidth = 100;
            const logoHeight = 100;
            context.drawImage(logoImage, overlayCanvas.width - logoWidth - 10, overlayCanvas.height - logoHeight - 10, logoWidth, logoHeight);
        }

        requestAnimationFrame(drawOverlay);
    }
    drawOverlay();
});

stopRecordButton.addEventListener('click', function () {
    mediaRecorder.stop();
    isRecording = false;
    startRecordButton.style.display = 'inline';
    stopRecordButton.style.display = 'none';
    pauseRecordButton.style.display = 'none';
});

pauseRecordButton.addEventListener('click', function () {
    if (mediaRecorder.state === "recording") {
        mediaRecorder.pause();
        pauseRecordButton.textContent = "Resume Recording";
    } else {
        mediaRecorder.resume();
        pauseRecordButton.textContent = "Pause Recording";
    }
});

zoomRange.addEventListener('input', function () {
    const zoom = zoomRange.value;
    video.style.transform = `scale(${zoom})`;
    video.style.transformOrigin = 'center center';  
});

function getLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        } else {
            reject(new Error('Geolocation is not supported by this browser.'));
        }
    });
}

window.onload = startCamera;
