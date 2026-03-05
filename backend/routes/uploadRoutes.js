const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, admin } = require('../middleware/auth');

// ── Ensure uploads directory exists ──────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Multer disk storage ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `product-${unique}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|avif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files (jpg, png, gif, webp) are allowed.'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// ── POST /api/upload ──────────────────────────────────────────────────────────
// Admin only — upload a product image, returns { url }
router.post('/', protect, admin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    // Return a URL relative to the backend origin
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({ url });
});

module.exports = router;
