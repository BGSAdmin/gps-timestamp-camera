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
let fixedLogoImage = null;

// Load the fixed logo image
function loadFixedLogo() {
    fixedLogoImage = new Image();
    fixedLogoImage.onload = () => {
        console.log("Fixed logo image loaded successfully.");
    };
    fixedLogoImage.onerror = () => {
        console.warn("Fixed logo image failed to load, will use fallback.");
    };
    fixedLogoImage.src = 'logo.png';
}

// Load fixed logo on page load
loadFixedLogo();

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

        // Wait for video to load metadata to get proper dimensions
        video.addEventListener('loadedmetadata', () => {
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
        });

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

        // Setup media recorder for video with overlay
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
    const timestamp = new Date().toLocaleString();
    
    try {
        const position = await getCurrentLocation();

        // Draw footer details
        context.font = '16px Arial';
        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.lineWidth = 1;
        context.textAlign = 'left';
        
        const texts = [
            `Product: ${productName}`,
            `Name: ${farmerName}`,
            `Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`,
            `Timestamp: ${timestamp}`
        ];
        
        texts.forEach((text, index) => {
            const y = canvas.height - 90 + (index * 20);
            context.strokeText(text, 10, y);
            context.fillText(text, 10, y);
        });

        // Draw the uploaded logo or fixed logo in the footer
        const footerLogoWidth = 60;
        const footerLogoHeight = 30;
        const footerLogoX = 10;
        const footerLogoY = canvas.height - 120;

        if (logoImage && logoImage.complete) {
            context.drawImage(logoImage, footerLogoX, footerLogoY, footerLogoWidth, footerLogoHeight);
        } else if (fixedLogoImage && fixedLogoImage.complete) {
            context.drawImage(fixedLogoImage, footerLogoX, footerLogoY, footerLogoWidth, footerLogoHeight);
        } else {
            // Draw a placeholder rectangle if no logo is available
            context.fillStyle = 'rgba(76, 175, 80, 0.8)';
            context.fillRect(footerLogoX, footerLogoY, footerLogoWidth, footerLogoHeight);
            context.fillStyle = 'white';
            context.font = '12px Arial';
            context.textAlign = 'center';
            context.fillText('LOGO', footerLogoX + footerLogoWidth/2, footerLogoY + footerLogoHeight/2 + 4);
        }

        // Draw fixed logo and caption at the top-left corner
        const logoWidth = 50;
        const logoHeight = 50;
        const logoX = 10;
        const logoY = 10;
        
        if (fixedLogoImage && fixedLogoImage.complete) {
            context.drawImage(fixedLogoImage, logoX, logoY, logoWidth, logoHeight);
        } else {
            // Draw a placeholder rectangle if fixed logo is not available
            context.fillStyle = 'rgba(76, 175, 80, 0.8)';
            context.fillRect(logoX, logoY, logoWidth, logoHeight);
            context.fillStyle = 'white';
            context.font = '14px Arial';
            context.textAlign = 'center';
            context.fillText('LOGO', logoX + logoWidth/2, logoY + logoHeight/2 + 4);
        }
        
        context.font = '10px Arial';
        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.textAlign = 'center';
        context.strokeText("VHUMI.IN", logoX + logoWidth / 2, logoY + logoHeight + 15);
        context.fillText("VHUMI.IN", logoX + logoWidth / 2, logoY + logoHeight + 15);

        const dataUrl = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        document.getElementById('result').appendChild(img);

        downloadData(dataUrl, 'captured_image.png');
        
    } catch (error) {
        alert('Could not get GPS location: ' + error.message);
        console.error('Location error:', error);
    }
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
async function drawOverlay() {
    if (!isRecording) return;

    const context = overlayCanvas.getContext('2d');
    context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Draw the video frame first
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        context.drawImage(video, 0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    const productName = productNameInput.value || "Product";
    const farmerName = farmerNameInput.value || "Name";
    const timestamp = new Date().toLocaleString();
    
    // Try to get current location for real-time GPS
    try {
        const position = await getCurrentLocation();
        
        // Draw overlay information
        context.font = '16px Arial';
        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.lineWidth = 1;
        context.textAlign = 'left';
        
        const texts = [
            `Product: ${productName}`,
            `Name: ${farmerName}`,
            `Lat: ${position.coords.latitude.toFixed(5)}, Lon: ${position.coords.longitude.toFixed(5)}`,
            `Timestamp: ${timestamp}`
        ];
        
        const startY = overlayCanvas.height - 90;
        texts.forEach((text, index) => {
            const y = startY + (index * 20);
            context.strokeText(text, 10, y);
            context.fillText(text, 10, y);
        });
        
        // Draw recording indicator
        context.font = '20px Arial';
        context.fillStyle = 'red';
        context.strokeStyle = 'white';
        context.strokeText('● REC', 10, 30);
        context.fillText('● REC', 10, 30);
        
        // Draw logos if available
        const logoWidth = 50;
        const logoHeight = 50;
        const logoX = 10;
        const logoY = 50;
        
        if (fixedLogoImage && fixedLogoImage.complete) {
            context.drawImage(fixedLogoImage, logoX, logoY, logoWidth, logoHeight);
        } else {
            // Draw placeholder
            context.fillStyle = 'rgba(76, 175, 80, 0.8)';
            context.fillRect(logoX, logoY, logoWidth, logoHeight);
            context.fillStyle = 'white';
            context.font = '14px Arial';
            context.textAlign = 'center';
            context.fillText('LOGO', logoX + logoWidth/2, logoY + logoHeight/2 + 4);
        }
        
        context.font = '10px Arial';
        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.textAlign = 'center';
        context.strokeText("VHUMI.IN", logoX + logoWidth / 2, logoY + logoHeight + 15);
        context.fillText("VHUMI.IN", logoX + logoWidth / 2, logoY + logoHeight + 15);
        
    } catch (error) {
        console.warn("Could not get location for overlay:", error);
        // Draw basic recording indicator even without GPS
        context.font = '20px Arial';
        context.fillStyle = 'red';
        context.strokeStyle = 'white';
        context.strokeText('● REC', 10, 30);
        context.fillText('● REC', 10, 30);
    }

    requestAnimationFrame(drawOverlay);
}

// Helper function to get current location
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocation is not supported by this browser.');
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 30000
        });
    });
}
