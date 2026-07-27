const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
});

// 🔥 আপনার Cloudmersive API Key এখানে বসিয়ে দিন
const CLOUDMERSIVE_API_KEY = 'YOUR_CLOUDMERSIVE_API_KEY_HERE';

app.get('/', (req, res) => {
    res.status(200).send('Smart Cloudmersive Converter Server is Running!');
});

app.post('/convert', upload.single('file'), async (req, res) => {
    console.log('-> Cloudmersive exact convert hit received!');

    if (!req.file) {
        return res.status(400).send('Error: No file uploaded by client.');
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const originalName = path.parse(req.file.originalname).name;

    const supportedExts = ['.doc', '.docx'];
    if (!supportedExts.includes(ext)) {
        return res.status(400).send('Error: Only Word files (.doc, .docx) are supported for exact layout conversion.');
    }

    try {
        // ফর্ম ডাটা তৈরি করে ফাইলটি Cloudmersive এপিআই-তে পাঠানো হচ্ছে
        const formData = new FormData();
        formData.append('inputFile', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        // মাইক্রোসফট অফিসের রেন্ডারিং ইঞ্জিন ব্যবহার করে ওয়ার্ডকে সরাসরি নিখুঁত পিডিএফে রূপান্তর করবে
        const response = await axios.post(
            'https://api.cloudmersive.com/convert/docx/to/pdf',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Apikey': CLOUDMERSIVE_API_KEY,
                },
                responseType: 'arraybuffer',
                timeout: 60000
            }
        );

        const outputFileName = `Converted-${Date.now()}.pdf`;
        const outputPath = path.join(uploadDir, outputFileName);

        fs.writeFileSync(outputPath, response.data);

        console.log('-> Exact conversion successful, sending file back...');
        res.download(outputPath, `${originalName}.pdf`, (dlErr) => {
            if (dlErr) {
                console.error('-> Download error:', dlErr);
            }
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        });

    } catch (e) {
        console.error('-> Cloudmersive Conversion Error:', e.message);
        return res.status(500).send('Error: Failed to convert with exact layout. ' + e.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});
