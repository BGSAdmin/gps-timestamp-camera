const openCameraButton = document.getElementById('open-camera');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const overlayCanvas = document.createElement('canvas');
const takePhotoButton = document.getElementById('take-photo');
const startRecordButton = document.getElementById('start-record');
const stopRecordButton = document.getElementById('stop-record');
const pauseRecordButton = document.getElementById('pause-record');
const zoomRange = document.getElementById('zoom-range');
const productNameInput = document.getElementById('product-name');
const farmerNameInput = document.getElementById('farmer-name');
const logoInput = document.getElementById('logo-upload');
const cameraSelect = document.getElementById('camera-select');

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let logoImage = null;

// Load logo image on file change
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

// Open camera when camera selection changes
cameraSelect.addEventListener('change', startCamera);

// Open camera on button click
openCameraButton.addEventListener('click', startCamera);

// Start the camera function
async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: cameraSelect.value === 'any' ? undefined : { exact: cameraSelect.value }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.muted = true;

        // Set up media recorder with combined video and audio tracks
        const canvasStream = overlayCanvas.captureStream(30);
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...stream.getAudioTracks()
        ]);

        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/mp4' });
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };
        mediaRecorder.onstop = saveVideo;

    } catch (err) {
        console.error("Error accessing the camera: ", err);
        alert("Could not access the camera. Please check your permissions and try again.");
    }
}

// Function to save the recorded video
function saveVideo() {
    const blob = new Blob(recordedChunks, { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const videoElement = document.createElement('video');
    videoElement.controls = true;
    videoElement.src = url;
    document.getElementById('result').appendChild(videoElement);
    downloadData(url, 'video_recording.mp4');
    recordedChunks = [];
}

// Function to download captured data
function downloadData(url, fileName) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
}

// Capture image with GPS and timestamp
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
    context.fillText(`Name: ${farmerName}`, 10, 60);
    context.fillText(`Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`, 10, 90);
    context.fillText(`Timestamp: ${timestamp}`, 10, canvas.height - 20); // Timestamp at the footer

    if (logoImage) {
        const logoWidth = 100;
        const logoHeight = 100;
        context.drawImage(logoImage, canvas.width - logoWidth - 10, canvas.height - logoHeight - 10, logoWidth, logoHeight);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = dataUrl;
    document.getElementById('result').appendChild(img);
    downloadData(dataUrl, 'captured_image.png');
});

// Video recording functions
startRecordButton.addEventListener('click', function () {
    mediaRecorder.start();
    isRecording = true;
    startRecordButton.style.display = 'none';
    stopRecordButton.style.display = 'inline';
    pauseRecordButton.style.display = 'inline';
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
    if (isRecording) {
        mediaRecorder.pause();
        pauseRecordButton.textContent = 'Resume Recording';
    } else {
        mediaRecorder.resume();
        pauseRecordButton.textContent = 'Pause Recording';
    }
    isRecording = !isRecording;
});

function drawOverlay() {
    if (!isRecording) return;
    const context = overlayCanvas.getContext('2d');
    context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    context.font = '20px Arial';
    context.fillStyle = 'red';
    context.fillText('Recording...', 10, 30);
    requestAnimationFrame(drawOverlay);
}

// Function to get GPS location
async function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocation is not supported by this browser.');
        }
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}
