const express = require('express');
const multer = require('multer');
const libre = require('libreoffice-convert');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
    res.send('Smart Converter Server is Running Successfully!');
});

app.post('/convert', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputPath = path.join('uploads', `${originalName}-${Date.now()}.pdf`);

    const fileExt = path.extname(req.file.originalname);

    fs.readFile(inputPath, (err, fileData) => {
        if (err) {
            return res.status(500).send('Error reading uploaded file.');
        }

        libre.convert(fileData, '.pdf', undefined, (err, done) => {
            if (err) {
                console.error('Conversion error:', err);
                return res.status(500).send('Error converting file: ' + err.message);
            }

            fs.writeFile(outputPath, done, (err) => {
                if (err) {
                    return res.status(500).send('Error saving converted file.');
                }

                res.download(outputPath, `${originalName}.pdf`, (err) => {
                    // ক্লিনআপ ফাইলস
                    fs.unlink(inputPath, () => {});
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
