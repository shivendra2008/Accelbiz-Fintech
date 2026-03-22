{
    const PUBLIC_KEY = 'project_public_57cab996d5197073185393c271ef02bc_3HRVFc885bb890473c9465721b0dff2549d49';
    
    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("fileInput");
    const uploadBtn = document.getElementById("uploadBtn");
    const convertBtn = document.getElementById("convertBtn");
    
    const fileInfo = document.getElementById("file-info");
    const fileNameSpan = document.getElementById("file-name");
    const fileSizeSpan = document.getElementById("file-size");
    
    const progressContainer = document.getElementById("progress-container");
    const dynamicBar = document.getElementById("dynamic-bar");
    const progressText = document.getElementById("progress-text");

    let selectedFile = null;

    uploadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    dropArea.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => handleFileSelection(e.target.files[0]));

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function handleFileSelection(file) {
        if (file && file.name.endsWith(".docx")) {
            selectedFile = file;
            
            // Show file details
            fileNameSpan.innerText = file.name;
            fileSizeSpan.innerText = formatBytes(file.size);
            fileInfo.style.display = "block";
            
            convertBtn.style.display = "block";
        } else {
            alert("Please select a .docx file");
        }
    }

    // Change this line in your convertBtn listener:
const updateUI = (percent, text) => {
    dynamicBar.style.width = percent + "%";
    progressText.innerText = `${text}... ${percent}%`; // Updated to look cleaner
};
    convertBtn.addEventListener("click", async () => {
        if (!selectedFile) return;

        convertBtn.style.display = "none";
        dropArea.style.display = "none";
        progressContainer.style.display = "block";

        try {
            // AUTH & START
            const authRes = await fetch('https://api.ilovepdf.com/v1/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_key: PUBLIC_KEY })
            });
            const { token } = await authRes.json();

            const startRes = await fetch('https://api.ilovepdf.com/v1/start/officepdf', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = await startRes.json();

            // UPLOAD
            const uploadFile = () => {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    const formData = new FormData();
                    formData.append('task', task);
                    formData.append('file', selectedFile);

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percent = Math.round((e.loaded / e.total) * 70) + 10;
                            updateUI(percent, "Uploading");
                        }
                    };

                    xhr.onload = () => resolve(JSON.parse(xhr.responseText));
                    xhr.open('POST', `https://${server}/v1/upload`);
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                    xhr.send(formData);
                });
            };

            const { server_filename } = await uploadFile();

            // PROCESS
            updateUI(85, "Converting");
            await fetch(`https://${server}/v1/process`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: task,
                    tool: 'officepdf',
                    files: [{ server_filename, filename: selectedFile.name }]
                })
            });

            // DOWNLOAD WITH CUSTOM NAME
            updateUI(95, "Downloading");
            const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await downloadRes.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Logic for custom filename: Original Name - converted.pdf
            const originalName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'));
            const customFileName = `${originalName}-converted.pdf`;

            const a = document.createElement('a');
            a.href = url;
            a.download = customFileName;
            a.click();
            
            updateUI(100, "Done!");
            setTimeout(() => location.reload(), 3000);

        } catch (error) {
            console.error(error);
            alert("Process failed.");
            location.reload();
        }
    });

    // Drag and Drop listeners
    dropArea.addEventListener("dragover", (e) => { e.preventDefault(); dropArea.classList.add("active"); });
    dropArea.addEventListener("dragleave", () => dropArea.classList.remove("active"));
    dropArea.addEventListener("drop", (e) => {
        e.preventDefault();
        dropArea.classList.remove("active");
        handleFileSelection(e.dataTransfer.files[0]);
    });
}