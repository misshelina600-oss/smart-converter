const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }
});

app.get('/', (req, res) => {
    res.status(200).send('Smart Converter Server is Running Successfully!');
});

app.post('/convert', upload.single('file'), (req, res) => {
    console.log('-> /convert hit received!');

    if (!req.file) {
        console.log('-> Error: No file found in request.');
        return res.status(400).send('Error: No file uploaded by client.');
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputFileName = `Converted-${Date.now()}.pdf`;
    const outputPath = path.join(uploadDir, outputFileName);

    // সার্ভার ক্রাশ রোধ করতে LibreOffice-এর জন্য আলাদা ইউজার প্রোফাইল ও সেফ কমান্ড
    const userInstallation = `file:///tmp/libo_user_${Date.now()}`;
    const command = `soffice -env:UserInstallation="${userInstallation}" --headless --convert-to pdf --outdir "${uploadDir}" "${inputPath}"`;

    exec(command, (error, stdout, stderr) => {
        // টেম্পোরারি ফোল্ডার পরিষ্কার করা
        fs.unlink(inputPath, () => {});

        if (error) {
            console.error('-> Shell Execution Error:', error);
            console.error('-> Stderr:', stderr);
            return res.status(500).send('Error: LibreOffice failed to convert document.');
        }

        const generatedPdfName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const generatedPdfPath = path.join(uploadDir, generatedPdfName);

        if (fs.existsSync(generatedPdfPath)) {
            fs.renameSync(generatedPdfPath, outputPath);

            console.log('-> Conversion successful, sending file back...');
            res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
                if (dlErr) {
                    console.error('-> Download error:', dlErr);
                }
                fs.unlink(outputPath, () => {});
            });
        } else {
            console.error('-> Converted PDF not found.');
            return res.status(500).send('Error: PDF generation failed.');
        }
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
