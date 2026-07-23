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

// মাল্টিপার্ট কনফিগারেশন আরও নিরাপদ করা হলো
const upload = multer({ 
    dest: uploadDir,
    limits: { fileSize: 10 * 1024 * 1024 } // সর্বোচ্চ ১০ মেগাবাইট লিমিট
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
                    // ডাউনলোড শেষ হলে আউটপুট ফাইল মুছে ফেলব
                    fs.unlink(outputPath, () => {});
                });
            });
        });
    });
});

// গ্লোবাল এরর হ্যান্ডলার যাতে কোনো অবস্থাতেই ক্র্যাশ না করে
app.use((err, req, res, next) => {
    console.error('-> Global Server Error:', err.stack);
    res.status(500).send('Error: Internal Server Crash occurred.');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
