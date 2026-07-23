const express = require('express');
const multer = require('multer');
const libre = require('libreoffice-convert');
const fs = require('fs');
const path = require('path');

const app = express();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

// রুট চেক
app.get('/', (req, res) => {
    res.status(200).send('Smart Converter Server is Running Successfully!');
});

// মূল কনভার্ট রাউট
app.post('/convert', upload.single('file'), (req, res) => {
    console.log("Received convert request!");
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputPath = path.join(uploadDir, `${originalName}-${Date.now()}.pdf`);

    fs.readFile(inputPath, (err, fileData) => {
        if (err) {
            fs.unlink(inputPath, () => {});
            return res.status(500).send('Error reading file.');
        }

        libre.convert(fileData, '.pdf', undefined, (convErr, done) => {
            fs.unlink(inputPath, () => {});

            if (convErr) {
                console.error('Conversion error:', convErr);
                return res.status(500).send('Conversion failed.');
            }

            fs.writeFile(outputPath, done, (writeErr) => {
                if (writeErr) {
                    return res.status(500).send('Error saving file.');
                }

                res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
                    fs.unlink(outputPath, () => {});
                });
            });
        });
    });
});

// যদি কোনো কারণে রাউট ম্যাচ না করে তবে যেন Not Found না দেখিয়ে পরিষ্কার মেসেজ দেয়
app.use((req, res) => {
    res.status(404).send('API Endpoint Not Found on Server.');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
