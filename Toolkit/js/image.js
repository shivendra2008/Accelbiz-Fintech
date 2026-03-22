const previewContainer = document.getElementById("previewContainer");
const originalPreview = document.getElementById("originalPreview");
const convertedPreview = document.getElementById("convertedPreview");

function convert() {
    const fileInput = document.getElementById("upload");
    const file = fileInput.files[0];

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const pngUrl = canvas.toDataURL("image/png");

        const download = document.getElementById("download");
        download.href = pngUrl;
        download.download = "converted.png";
        download.style.display = "block";
        download.innerText = "Download PNG";
    };
}
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("fileInput");
const downloadBtn = document.getElementById("downloadBtn");

// CLICK UPLOAD
fileInput.addEventListener("change", () => {
  handleFile(fileInput.files[0]);
});

// DRAG EVENTS
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.style.borderColor = "#285f89";
});

dropArea.addEventListener("dragleave", () => {
  dropArea.style.borderColor = "#ccc";
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

// CONVERT FUNCTION
const loader = document.getElementById("loader");
const progress = document.getElementById("progress");

function handleFile(file) {
  if (!file) return;

  // Show original preview instantly
  originalPreview.src = URL.createObjectURL(file);
  previewContainer.style.display = "flex";

  loader.style.display = "block";
  downloadBtn.style.display = "none";

  let percent = 0;

  const interval = setInterval(() => {
    percent += 5;
    progress.style.width = percent + "%";

    if (percent >= 100) {
      clearInterval(interval);
      convertImage(file);
    }
  }, 100);
}

// ACTUAL CONVERSION AFTER LOADING
function convertImage(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");

    // IMPORTANT: Fill white background (JPG doesn't support transparency)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0);

    const jpgUrl = canvas.toDataURL("image/jpeg", 0.9);

    convertedPreview.src = jpgUrl;

    downloadBtn.href = jpgUrl;
    downloadBtn.download = "converted.jpg";
    downloadBtn.style.display = "inline-block";

    loader.style.display = "none";
    progress.style.width = "0%";
  };
}
