const express = require('express');
const multer = require('multer');
const libre = require('libreoffice-convert');
const fs = require('fs');
const path = require('path');

const app = express();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    storage: multer.memoryStorage(), // ফাইল মেমোরিতে প্রসেস হবে, সার্ভারে জ্যাম লাগবে না
    limits: { fileSize: 25 * 1024 * 1024 }
});

app.get('/', (req, res) => {
    res.status(200).send('Smart Multi-Format Converter Server is Running!');
});

app.post('/convert', upload.single('file'), async (req, res) => {
    console.log('-> Multi-format convert hit received!');

    if (!req.file) {
        return res.status(400).send('Error: No file uploaded by client.');
    }

    const inputBuffer = req.file.buffer;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const originalName = path.parse(req.file.originalname).name;

    // সমর্থনিত ফরম্যাট চেক: Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx)
    const supportedExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    if (!supportedExts.includes(ext)) {
        return res.status(400).send('Error: Unsupported file format. Only Word, Excel, and PPT are allowed.');
    }

    libre.convert(inputBuffer, '.pdf', undefined, (err, doneBuffer) => {
        if (err) {
            console.error('-> Conversion Error:', err);
            return res.status(500).send('Error: Failed to convert document using library.');
        }

        const outputFileName = `Converted-${Date.now()}.pdf`;
        const outputPath = path.join(uploadDir, outputFileName);

        fs.writeFileSync(outputPath, doneBuffer);

        console.log('-> Conversion successful, sending file back...');
        res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
            if (dlErr) {
                console.error('-> Download error:', dlErr);
            }
            fs.unlink(outputPath, () => {});
        });
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
