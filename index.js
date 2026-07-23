const express = require('express');
const multer = require('multer');
const docxPdf = require('docx-pdf');
const fs = require('fs');
const path = require('path');

const app = express();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
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

    // docx-pdf দিয়ে কনভার্শন
    docxPdf(inputPath, outputPath, (err, result) => {
        fs.unlink(inputPath, () => {}); // ইনপুট ফাইল ডিলিট

        if (err) {
            console.error('-> Conversion error:', err);
            return res.status(500).send('Error: Failed to convert this file.');
        }

        console.log("-> Conversion successful, sending file back...");
        res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
            fs.unlink(outputPath, () => {}); // আউটপুট ফাইল ডিলিট
        });
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
