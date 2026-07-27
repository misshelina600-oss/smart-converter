const express = require('express');
const multer = require('multer');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
});

app.get('/', (req, res) => {
    res.status(200).send('Smart Converter Server is Running Smoothly!');
});

app.post('/convert', upload.single('file'), async (req, res) => {
    console.log('-> Convert request received!');

    if (!req.file) {
        return res.status(400).send('Error: No file uploaded by client.');
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const originalName = path.parse(req.file.originalname).name;

    const supportedExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    if (!supportedExts.includes(ext)) {
        return res.status(400).send('Error: Unsupported file format.');
    }

    const uniqueId = Date.now();
    const inputPath = path.join(uploadDir, `input-${uniqueId}${ext}`);
    const outputPdfPath = path.join(uploadDir, `input-${uniqueId}.pdf`);

    try {
        fs.writeFileSync(inputPath, req.file.buffer);

        // সার্ভারের নিজস্ব LibreOffice ইঞ্জিন দিয়ে ফাইল কনভার্ট করা হচ্ছে
        execFile('soffice', [
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', uploadDir,
            inputPath
        ], { timeout: 60000 }, (error, stdout, stderr) => {

            if (fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
            }

            if (error) {
                console.error('-> Conversion Error:', error);
                if (fs.existsSync(outputPdfPath)) fs.unlinkSync(outputPdfPath);
                return res.status(500).send('Error: Failed to convert document.');
            }

            if (!fs.existsSync(outputPdfPath)) {
                return res.status(500).send('Error: Converted PDF not found.');
            }

            console.log('-> Conversion successful, sending file...');
            res.download(outputPdfPath, `${originalName}.pdf`, (dlErr) => {
                if (dlErr) console.error('-> Download error:', dlErr);
                if (fs.existsSync(outputPdfPath)) fs.unlinkSync(outputPdfPath);
            });
        });

    } catch (e) {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        console.error('-> Process Error:', e);
        return res.status(500).send('Error: ' + e.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
