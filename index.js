const express = require('express');
const multer = require('multer');
const libre = require('libreoffice-convert');
const fs = require('fs');
const path = require('path');

const app = express();

// আপলোড ফোল্ডার না থাকলে নিজে তৈরি করে নেবে
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

app.get('/', (req, res) => {
    res.send('Smart Converter Server is Running Successfully!');
});

app.post('/convert', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputPath = path.join(uploadDir, `${originalName}-${Date.now()}.pdf`);

    fs.readFile(inputPath, (err, fileData) => {
        if (err) {
            fs.unlink(inputPath, () => {});
            return res.status(500).send('Error reading uploaded file.');
        }

        libre.convert(fileData, '.pdf', undefined, (convErr, done) => {
            fs.unlink(inputPath, () => {}); // ইনপুট ফাইল মুছে ফেলা

            if (convErr) {
                console.error('Conversion error:', convErr);
                return res.status(500).send('Conversion error: ' + convErr.message);
            }

            fs.writeFile(outputPath, done, (writeErr) => {
                if (writeErr) {
                    return res.status(500).send('Error saving converted file.');
                }

                res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
                    // ডাউনলোড শেষ হলে আউটপুট ফাইল মুছে ফেলা
                    fs.unlink(outputPath, () => {});
                });
            });
        });
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
