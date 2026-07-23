const express = require('express');
const multer = require('multer');
const libre = require('libreoffice-convert');
const fs = require('fs');
const path = require('path');

// async ভার্সনে কনভার্ট করার জন্য প্রমিস ব্যবহার করা
const util = require('util');
const convertAsync = util.promisify(libre.convert);

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
    limits: { fileSize: 20 * 1024 * 1024 } // সর্বোচ্চ ২০ এমবি ফাইল সাইজ
});

app.get('/', (req, res) => {
    res.status(200).send('Smart Converter Server is Running Successfully!');
});

app.post('/convert', upload.single('file'), async (req, res) => {
    console.log("-> /convert hit received!");
    
    if (!req.file) {
        console.log("-> Error: No file found in request.");
        return res.status(400).send('Error: No file uploaded by client.');
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputPath = path.join(uploadDir, `${originalName}-${Date.now()}.pdf`);

    try {
        // ফাইল রিড করা
        const fileData = fs.readFileSync(inputPath);

        // LibreOffice দিয়ে একদম নিখুঁত ফরম্যাটিং বজায় রেখে পিডিএফ কনভার্শন
        // এখানে undefined ফিল্ডটি দিয়ে ফাইলের মূল লেআউট এবং ছবি অক্ষুণ্ণ রাখা হয়
        const pdfBuf = await convertAsync(fileData, '.pdf', undefined);

        // ফাইল সেভ করা
        fs.writeFileSync(outputPath, pdfBuf);

        // ইনপুট ফাইল মুছে ফেলা
        fs.unlink(inputPath, () => {});

        console.log("-> Perfect Conversion successful, sending file back...");
        res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
            fs.unlink(outputPath, () => {}); // ডাউনলোড শেষ হলে আউটপুট ফাইল মুছে ফেলা
        });

    } catch (err) {
        console.error('-> LibreOffice High-Quality Conversion error:', err);
        fs.unlink(inputPath, () => {});
        fs.unlink(outputPath, () => {}).catch?.();
        return res.status(500).send('Error: Failed to convert file while keeping original formatting.');
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
