const express = require('express');
const multer = require('multer');
const libre = require('libreoffice-convert');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
    res.send('Smart Converter Server is Running!');
});

app.post('/convert', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputPath = path.join('uploads', `${originalName}-${Date.now()}.pdf`);

    fs.readFile(inputPath, (err, fileData) => {
        if (err) {
            return res.status(500).send('Error reading uploaded file.');
        }

        // LibreOffice কনভার্শন
        libre.convert(fileData, '.pdf', undefined, (err, done) => {
            // ফাইল আপলোড ইনপুট রিমুভ করে দেই
            fs.unlink(inputPath, () => {});

            if (err) {
                console.error('Conversion error:', err);
                return res.status(500).send('Conversion error: ' + err.message);
            }

            fs.writeFile(outputPath, done, (err) => {
                if (err) {
                    return res.status(500).send('Error saving converted file.');
                }

                res.download(outputPath, `${originalName}.pdf`, (err) => {
                    // ডাউনলোড শেষ হলে সার্ভার থেকে ফাইল ডিলিট করে দেব
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
