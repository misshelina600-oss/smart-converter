const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { convert } = require('libreoffice-convert'); // অথবা ব্যাকআপ মেথড

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
    limits: { fileSize: 20 * 1024 * 1024 } 
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
            fs.unlink(inputPath, () => {});
            return res.status(500).send('Error reading file.');
        }

        // লিনাক্সের ডিফল্ট বাইনারি পথ সেট করে কনভার্ট করার চেষ্টা
        const matchingBinaries = ['soffice', '/usr/bin/soffice', '/usr/local/bin/soffice'];
        
        convert(fileData, '.pdf', undefined, (convErr, done) => {
            fs.unlink(inputPath, () => {});

            if (convErr) {
                console.error('-> Conversion fallback error:', convErr);
                // যদি LibreOffice না পাওয়া যায়, তবে ক্লাউড বা অল্টারনেটিভ ফ্রি রেন্ডারিং ব্যবহার করা নিরাপদ
                return res.status(500).send('Error: Server missing document conversion engine binary.');
            }

            fs.writeFile(outputPath, done, (writeErr) => {
                if (writeErr) {
                    return res.status(500).send('Error saving PDF.');
                }

                res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
                    fs.unlink(outputPath, () => {});
                });
            });
        });
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
