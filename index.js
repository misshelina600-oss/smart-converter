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

// Multer কনফিগারেশন যাতে ফাইলের সঠিক এক্সটেনশন বজায় থাকে
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
    limits: { fileSize: 15 * 1024 * 1024 } 
});

app.get('/', (req, res) => {
    res.status(200).send('Smart Converter Server is Running Successfully!');
});

app.post('/convert', upload.single('file'), (req, res) => {
    console.log("-> /convert hit received!");
    
    if (!req.file) {
        console.log("-> Error: No file found in request.");
        return res.status(400).send('Error: No file uploaded by client.');
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputPath = path.join(uploadDir, `${originalName}-${Date.now()}.pdf`);

    fs.readFile(inputPath, (err, fileData) => {
        if (err) {
            console.log("-> Error reading uploaded file:", err);
            fs.unlink(inputPath, () => {});
            return res.status(500).send('Error: Failed to read uploaded file on server.');
        }

        // LibreOffice কনভার্শন
        libre.convert(fileData, '.pdf', undefined, (convErr, done) => {
            fs.unlink(inputPath, () => {}); // ইনপুট ফাইল মুছে ফেলা

            if (convErr) {
                console.error('-> LibreOffice Conversion error:', convErr);
                return res.status(500).send('Error: LibreOffice failed to convert this file.');
            }

            fs.writeFile(outputPath, done, (writeErr) => {
                if (writeErr) {
                    console.log("-> Error saving converted PDF:", writeErr);
                    return res.status(500).send('Error: Failed to save converted PDF.');
                }

                console.log("-> Conversion successful, sending file back...");
                res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
                    fs.unlink(outputPath, () => {});
                });
            });
        });
    });
});

app.use((err, req, res, next) => {
    console.error('-> Global Server Error:', err.stack);
    res.status(500).send('Error: Internal Server Crash occurred.');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
