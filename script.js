const openCameraButton = document.getElementById('open-camera');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const overlay = document.getElementById('overlay');
const takePhotoButton = document.getElementById('take-photo');
const startRecordButton = document.getElementById('start-record');
const stopRecordButton = document.getElementById('stop-record');
const pauseRecordButton = document.getElementById('pause-record');
const zoomRange = document.getElementById('zoom-range');
const productInput = document.getElementById('product-name'); // Updated ID reference
const farmerInput = document.getElementById('farmer-name'); // Updated ID reference
const logoInput = document.getElementById('logo-upload');
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let logoImage = null;
let canvasStream;
let overlayCanvas = document.createElement('canvas');

// Load fixed logo image
const fixedLogoImage = new Image();
fixedLogoImage.src = './logo.png'; // Adjust the path as needed

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

openCameraButton.addEventListener('click', async function() {
    console.log("Open Camera button clicked"); // Check if it's responding
    await startCamera();
    takePhotoButton.style.display = 'inline-block';
    startRecordButton.style.display = 'inline-block';
    zoomRange.style.display = 'inline-block';
});

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });

        video.srcObject = stream;
        video.muted = true;

        // Additional setup for mediaRecorder
        canvasStream = overlayCanvas.captureStream(30);
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...stream.getAudioTracks()
        ]);

        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/mp4' }); // Changed to MP4

        mediaRecorder.ondataavailable = function(event) {
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
    const blob = new Blob(recordedChunks, { type: 'video/mp4' }); // Changed to MP4
    const url = URL.createObjectURL(blob);
    const videoElement = document.createElement('video');
    videoElement.controls = true;
    videoElement.src = url;
    document.getElementById('result').appendChild(videoElement);
    downloadData(url, 'video_recording.mp4'); // Changed to MP4
    recordedChunks = [];
}

takePhotoButton.addEventListener('click', async function () {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const productName = productInput.value || "Product"; // Updated variable name
    const farmerName = farmerInput.value || "Name"; // Updated variable name

    const position = await getLocation();
    const timestamp = new Date().toLocaleString();
    context.font = '20px Arial';
    context.fillStyle = 'white';
    context.fillText(`Product: ${productName}`, 10, 30);
    context.fillText(`Name: ${farmerName}`, 10, 60);
    context.fillText(`Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`, 10, 90);
    context.fillText(`Timestamp: ${timestamp}`, 10, canvas.height - 30); // Moved to footer section

    // Draw fixed logo
    const logoWidth = 80;
    const logoHeight = 80;
    context.drawImage(fixedLogoImage, canvas.width - logoWidth - 10, 10, logoWidth, logoHeight);
    context.fillText("VHUMI.IN", canvas.width - logoWidth / 2 - 10, 10 + logoHeight + 20); // Caption under logo

    const dataUrl = canvas.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = dataUrl;
    document.getElementById('result').appendChild(img);

    downloadData(dataUrl, 'captured_image.png');
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

        const productName = productInput.value || "Product"; // Updated variable name
        const farmerName = farmerInput.value || "Name"; // Updated variable name

        context.font = '20px Arial';
        context.fillStyle = 'white';
        const position = {
            coords: { latitude: 12.9716, longitude: 77.5946 }
        };
        const timestamp = new Date().toLocaleString();
        context.fillText(`Product: ${productName}`, 10, 30);
        context.fillText(`Name: ${farmerName}`, 10, 60);
        context.fillText(`Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`, 10, 90);
        context.fillText(`Timestamp: ${timestamp}`, 10, overlayCanvas.height - 30); // Moved to footer section

        // Draw fixed logo
        const logoWidth = 80;
        const logoHeight = 80;
        context.drawImage(fixedLogoImage, overlayCanvas.width - logoWidth - 10, 10, logoWidth, logoHeight);
        context.fillText("VHUMI.IN", overlayCanvas.width - logoWidth / 2 - 10, 10 + logoHeight + 20); // Caption under logo

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
