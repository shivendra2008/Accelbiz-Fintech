{
    const CLIENT_ID = '7003d4879d1c44f2add19c8d355c454e';
    const CLIENT_SECRET = 'p8e-dXpLEWdLKhOoRX6ecoB5okPbQzcCXFtq';

    // Elements
    const fileInput = document.getElementById("fileInput");
    const uploadBtn = document.getElementById("uploadBtn");
    const convertBtn = document.getElementById("convertBtn");
    const dropArea = document.getElementById("drop-area");
    const dynamicBar = document.getElementById("dynamic-bar");
    const progressText = document.getElementById("progress-text");
    const progressContainer = document.getElementById("progress-container");
    const fileNameSpan = document.getElementById("file-name");
    const fileInfo = document.getElementById("file-info");

    let selectedFile = null;

    // --- FIX: OPEN FILE DIALOG ---
    uploadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropArea.addEventListener("click", () => fileInput.click());

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf'))) {
            selectedFile = file;
            fileNameSpan.innerText = file.name;
            fileInfo.style.display = "block";
            convertBtn.style.display = "flex";
        }
    };

    const updateUI = (percent, text) => {
        dynamicBar.style.width = percent + "%";
        progressText.innerText = `${text}... ${percent}%`;
    };

    // --- ADOBE API LOGIC ---
    convertBtn.addEventListener("click", async () => {
        if (!selectedFile) return;

        convertBtn.style.display = "none";
        dropArea.style.display = "none";
        progressContainer.style.display = "block";

        try {
            // STEP 1: AUTHENTICATION (Using Proxy to bypass CORS/Blank Response)
            updateUI(10, "Authenticating");
            
            // Using a public CORS proxy for testing
            const proxy = "https://cors-anywhere.herokuapp.com/";
            const authUrl = "https://pdf-services.adobe.io/token";

            const authRes = await fetch(proxy + authUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({
                    'client_id': CLIENT_ID,
                    'client_secret': CLIENT_SECRET,
                    'grant_type': 'client_credentials',
                    'scope': 'openid,AdobeID,read_organizations'
                })
            });

            if (!authRes.ok) {
                const errBody = await authRes.text();
                throw new Error(`Adobe Auth Failed: ${errBody}`);
            }

            const { access_token } = await authRes.json();

            // STEP 2: GET UPLOAD ASSET
            updateUI(30, "Preparing Asset");
            const assetRes = await fetch(proxy + 'https://pdf-services.adobe.io/assets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'x-api-key': CLIENT_ID,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ mediaType: 'application/pdf' })
            });
            const { uploadUri, assetID } = await assetRes.json();

            // STEP 3: UPLOAD TO ADOBE STORAGE
            updateUI(50, "Uploading PDF");
            await fetch(proxy + uploadUri, {
                method: 'PUT',
                body: selectedFile,
                headers: { 'Content-Type': 'application/pdf' }
            });

            // STEP 4: START CONVERSION JOB
            updateUI(70, "Converting");
            const jobRes = await fetch(proxy + 'https://pdf-services.adobe.io/operation/exportpdf', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'x-api-key': CLIENT_ID,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ assetID: assetID, targetFormat: 'docx' })
            });
            const jobUrl = jobRes.headers.get('location');

            // STEP 5: POLL FOR STATUS
            let status = 'in-progress';
            let downloadUri = '';
            while (status === 'in-progress') {
                await new Promise(r => setTimeout(r, 2000));
                const pollRes = await fetch(proxy + jobUrl, {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'x-api-key': CLIENT_ID,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const pollData = await pollRes.json();
                status = pollData.status;
                if (status === 'completed') downloadUri = pollData.asset.downloadUri;
            }

            // STEP 6: DOWNLOAD
            updateUI(95, "Downloading");
            const fileData = await fetch(proxy + downloadUri);
            const blob = await fileData.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedFile.name.replace(".pdf", "")}.docx`;
            a.click();

            updateUI(100, "Success!");
            setTimeout(() => location.reload(), 3000);

        } catch (error) {
            console.error(error);
            alert("Error: " + error.message + "\n\nNote: If using CORS-Anywhere, you may need to visit the proxy website to enable access.");
            location.reload();
        }
    });
}