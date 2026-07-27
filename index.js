const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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

app.post('/convert', upload.single('file'), (req, res) => {
    console.log('-> /convert hit received!');

    if (!req.file) {
        console.log('-> Error: No file found in request.');
        return res.status(400).send('Error: No file uploaded by client.');
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputFileName = `Converted-${Date.now()}.pdf`;
    const outputPath = path.join(uploadDir, outputFileName);

    // LibreOffice কে হেডলেস মোডে ফন্ট ایرর ইগ্নোর করার ফ্ল্যাগসহ চালানো
    const command = `soffice --headless --nologo --nolockcheck --nodefault --convert-to pdf --outdir "${uploadDir}" "${inputPath}"`;

    exec(command, (error, stdout, stderr) => {
        fs.unlink(inputPath, () => {}); // ইনপুট ফাইল মুছে ফেলা

        if (error) {
            console.error('-> Shell Execution Error:', error);
            return res.status(500).send('Error: LibreOffice conversion failed due to file structure.');
        }

        const generatedPdfName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const generatedPdfPath = path.join(uploadDir, generatedPdfName);

        if (fs.existsSync(generatedPdfPath)) {
            fs.renameSync(generatedPdfPath, outputPath);

            console.log('-> Conversion successful, sending file back...');
            res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
                if (dlErr) {
                    console.error('-> Download error:', dlErr);
                }
                fs.unlink(outputPath, () => {});
            });
        } else {
            console.error('-> Converted PDF not found.');
            return res.status(500).send('Error: PDF generation failed.');
        }
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
