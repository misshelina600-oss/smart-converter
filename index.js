const express = require('express');
const multer = require('multer');
const libre = require('libreoffice-convert');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const inputPath = req.file.path;
    const outputPath = path.join('uploads', `${Date.now()}_converted.pdf`);
    
    fs.readFile(inputPath, (err, fileBuffer) => {
        if (err) {
            return res.status(500).send('Error reading uploaded file.');
        }

        libre.convert(fileBuffer, '.pdf', undefined, (err, done) => {
            if (err) {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                return res.status(500).send('Error converting file: ' + err.message);
            }

            fs.writeFileSync(outputPath, done);
            
            res.download(outputPath, 'converted.pdf', (err) => {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            });
        });
    });
});

app.get('/', (req, res) => {
    res.send('Smart Converter API is running live!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
