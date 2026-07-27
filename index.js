const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const mammoth = require('mammoth'); // ওয়ার্ড ফাইলের টেক্সট পড়ার জন্য

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

app.post('/convert', upload.single('file'), async (req, res) => {
    console.log('-> /convert hit received!');

    if (!req.file) {
        console.log('-> Error: No file found in request.');
        return res.status(400).send('Error: No file uploaded by client.');
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputFileName = `Converted-${Date.now()}.pdf`;
    const outputPath = path.join(uploadDir, outputFileName);

    try {
        // ১. Mammoth দিয়ে ওয়ার্ড ফাইল থেকে পরিষ্কার টেক্সট এক্সট্রাক্ট করা
        const result = await mammoth.extractRawText({ path: inputPath });
        const extractedText = result.value; // ফাইলের ভেতরের সব টেক্সট

        // ইনপুট ফাইল মুছে ফেলা
        fs.unlink(inputPath, () => {});

        // ২. PDFKit দিয়ে সরাসরি পিডিএফ ডকুমেন্ট জেনারেট করা
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // ফাইলে টেক্সট যোগ করা
        doc.fontSize(12).text(extractedText, {
            align: 'left',
            lineGap: 5
        });

        doc.end();

        // রাইট শেষ হওয়ার পর ক্লায়েন্টে পিডিএফ পাঠিয়ে দেওয়া
        writeStream.on('finish', () => {
            console.log('-> Conversion successful, sending file back...');
            res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
                if (dlErr) {
                    console.error('-> Download error:', dlErr);
                }
                fs.unlink(outputPath, () => {});
            });
        });

    } catch (error) {
        console.error('-> Conversion Error:', error);
        fs.unlink(inputPath, () => {});
        return res.status(500).send('Error: Failed to process document structure.');
    }
});

app.use((err, req, res, next) => {
    console.error('-> Global Server Error:', err.stack);
    res.status(500).send('Error: Internal Server Crash occurred.');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
