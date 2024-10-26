const openCameraButton = document.getElementById('open-camera');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
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
let logoImage = null;

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
            audio: true
        });

        video.srcObject = stream;
        video.play();

        // Setup media recorder
        const combinedStream = new MediaStream([
            stream.getVideoTracks()[0],
            stream.getAudioTracks()[0]
        ]);

        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });

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
    const zoom = parseFloat(zoomRange.value);

    // Set canvas dimensions
    canvas.width = video.videoWidth * zoom;
    canvas.height = video.videoHeight * zoom;

    // Draw video to canvas
    context.scale(zoom, zoom);
    context.drawImage(video, 0, 0);

    // Gather data for footer
    const productName = productNameInput.value || "Product";
    const farmerName = farmerNameInput.value || "Name";
    const position = await getLocation();
    const timestamp = new Date().toLocaleString();

    // Draw footer information
    context.font = '16px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'left';
    context.fillText(`Product: ${productName}`, 10 / zoom, canvas.height - 90 / zoom);
    context.fillText(`Name: ${farmerName}`, 10 / zoom, canvas.height - 70 / zoom);
    context.fillText(`Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`, 10 / zoom, canvas.height - 50 / zoom);
    context.fillText(`Timestamp: ${timestamp}`, 10 / zoom, canvas.height - 30 / zoom);

    // Draw logo
    const footerLogoWidth = 60 / zoom;
    const footerLogoHeight = 30 / zoom;
    const footerLogoX = 10 / zoom;
    const footerLogoY = canvas.height - 120 / zoom;

    const logoToDraw = logoImage && logoImage.complete ? logoImage : fixedLogoImage;
    context.drawImage(logoToDraw, footerLogoX, footerLogoY, footerLogoWidth, footerLogoHeight);

    // Reset canvas transform
    context.setTransform(1, 0, 0, 1, 0, 0);

    // Convert canvas to image and append to result
    const dataUrl = canvas.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = dataUrl;
    document.getElementById('result').appendChild(img);

    downloadData(dataUrl, 'captured_image.png');
});

stopRecordButton.addEventListener('click', function () {
    mediaRecorder.stop();
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
