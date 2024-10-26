const openCameraButton = document.getElementById('open-camera');
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

// Fixed logo image
const fixedLogoImage = new Image();
fixedLogoImage.src = './logo.png'; // Adjust path as needed

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
    console.log("Open Camera button clicked");
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

        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/mp4' });

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
    const blob = new Blob(recordedChunks, { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const videoElement = document.createElement('video');
    videoElement.controls = true;
    videoElement.src = url;
    document.getElementById('result').appendChild(videoElement);
    downloadData(url, 'video_recording.mp4');
    recordedChunks = [];
}

takePhotoButton.addEventListener('click', async function () {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const productName = productNameInput.value || "Product";
    const farmerName = farmerNameInput.value || "Name";
    const position = await getLocation();
    const timestamp = new Date().toLocaleString();

    // Draw all footer text (Product, Name, Lat/Lon, Timestamp) at the bottom
    context.font = '16px Arial';  // Smaller font size for footer
    context.fillStyle = 'white';
    context.textAlign = 'left';
    const footerText = `Product: ${productName} | Name: ${farmerName} | Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)} | Timestamp: ${timestamp}`;
    context.fillText(footerText, 10, canvas.height - 10); // Positioned at the footer

    // Draw the logo at the top-right corner with a smaller caption
    const logoWidth = 50;  // Smaller logo width
    const logoHeight = 50;  // Smaller logo height
    const logoX = canvas.width - logoWidth - 10;
    const logoY = 10;
    context.drawImage(fixedLogoImage, logoX, logoY, logoWidth, logoHeight);

    // Draw the caption "VHUMI.IN" under the logo
    context.font = '10px Arial';  // Smaller font for caption
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText("VHUMI.IN", logoX + logoWidth / 2, logoY + logoHeight + 15);

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

    async function drawOverlay() {
        if (!isRecording) return;

        context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        context.drawImage(video, 0, 0, overlayCanvas.width, overlayCanvas.height);

        const productName = productNameInput.value || "Product";
        const farmerName = farmerNameInput.value || "Name";
        const position = await getLocation();
        const timestamp = new Date().toLocaleString();

        // Draw all footer text (Product, Name, Lat/Lon, Timestamp) at the bottom
        context.font = '16px Arial';  // Smaller font size for footer
        context.fillStyle = 'white';
        context.textAlign = 'left';
        const footerText = `Product: ${productName} | Name: ${farmerName} | Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)} | Timestamp: ${timestamp}`;
        context.fillText(footerText, 10, overlayCanvas.height - 10); // Positioned at the footer

        // Draw the logo at the top-right corner with a smaller caption
        const logoWidth = 50;  // Smaller logo width
        const logoHeight = 50;  // Smaller logo height
        const logoX = overlayCanvas.width - logoWidth - 10;
        const logoY = 10;
        context.drawImage(fixedLogoImage, logoX, logoY, logoWidth, logoHeight);

        // Draw the caption "VHUMI.IN" under the logo
        context.font = '10px Arial';  // Smaller font for caption
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText("VHUMI.IN", logoX + logoWidth / 2, logoY + logoHeight + 15);

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
