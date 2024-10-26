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

// Handle logo upload
logoInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            logoImage = new Image();
            logoImage.onload = () => {
                console.log("Uploaded logo image loaded successfully.");
            };
            logoImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Open camera and enable zoom
openCameraButton.addEventListener('click', async function() {
    console.log("Open Camera button clicked");
    await startCamera();
    takePhotoButton.style.display = 'inline-block';
    startRecordButton.style.display = 'inline-block';
    zoomRange.style.display = 'inline-block';
});

// Function to start the camera with zoom functionality
async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: { exact: "environment" },
                zoom: true // Enable zoom
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.play();

        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();

        // Check if zoom is supported and set the zoom range
        if (capabilities.zoom) {
            zoomRange.min = capabilities.zoom.min;
            zoomRange.max = capabilities.zoom.max;
            zoomRange.step = capabilities.zoom.step;
            zoomRange.value = videoTrack.getSettings().zoom || capabilities.zoom.min;

            zoomRange.oninput = () => {
                videoTrack.applyConstraints({
                    advanced: [{ zoom: zoomRange.value }]
                });
            };
        }

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
        console.error("Error accessing the rear camera: ", err);
        alert("Could not access the rear camera. Please check your permissions and try again.");
    }
}

// Download function
function downloadData(url, fileName) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
}

// Save video recording
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

// Capture image with overlay and zoom applied
takePhotoButton.addEventListener('click', async function () {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const productName = productNameInput.value || "Product";
    const farmerName = farmerNameInput.value || "Name";
    const position = await getLocation();
    const timestamp = new Date().toLocaleString();

    // Draw footer details
    context.font = '16px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'left';
    context.fillText(`Product: ${productName}`, 10, canvas.height - 90);
    context.fillText(`Name: ${farmerName}`, 10, canvas.height - 70);
    context.fillText(`Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`, 10, canvas.height - 50);
    context.fillText(`Timestamp: ${timestamp}`, 10, canvas.height - 30);

    // Draw the uploaded logo or fixed logo in the footer
    const footerLogoWidth = 60;
    const footerLogoHeight = 30;
    const footerLogoX = 10;
    const footerLogoY = canvas.height - 120;

    if (logoImage && logoImage.complete) {
        context.drawImage(logoImage, footerLogoX, footerLogoY, footerLogoWidth, footerLogoHeight);
    } else {
        context.drawImage(fixedLogoImage, footerLogoX, footerLogoY, footerLogoWidth, footerLogoHeight);
    }

    // Draw fixed logo and caption at the top-left corner
    const logoWidth = 50;
    const logoHeight = 50;
    const logoX = 10;
    const logoY = 10;
    context.drawImage(fixedLogoImage, logoX, logoY, logoWidth, logoHeight);
    context.font = '10px Arial';
    context.textAlign = 'center';
    context.fillText("VHUMI.IN", logoX + logoWidth / 2, logoY + logoHeight + 15);

    const dataUrl = canvas.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = dataUrl;
    document.getElementById('result').appendChild(img);

    downloadData(dataUrl, 'captured_image.png');
});

// Start, stop, and pause recording functions
startRecordButton.addEventListener('click', function () {
    mediaRecorder.start();
    isRecording = true;
    stopRecordButton.style.display = 'inline';
    pauseRecordButton.style.display = 'inline';
    startRecordButton.style.display = 'none';
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

// Overlay for recording
function drawOverlay() {
    if (!isRecording) return;

    const context = overlayCanvas.getContext('2d');
    context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    context.font = '20px Arial';
    context.fillStyle = 'red';
    context.fillText('Recording...', 10, 30);

    requestAnimationFrame(drawOverlay);
}

// Get current location
async function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocation is not supported by this browser.');
        }
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}
