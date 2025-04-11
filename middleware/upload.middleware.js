const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter for Excel files
const excelFilter = (req, file, cb) => {
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const extension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (xlsx, xls) and CSV files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: excelFilter,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 // 5MB default
  }
});

// Middleware for handling Excel file upload
const uploadExcel = upload.single('file');

// Wrapper to handle multer errors
const handleExcelUpload = (req, res, next) => {
  uploadExcel(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error (file size, etc.)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: `File size exceeds the limit of ${(process.env.MAX_FILE_SIZE / (1024 * 1024)).toFixed(2)} MB`
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message
      });
    } else if (err) {
      // Other errors (file type, etc.)
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    // No errors, proceed
    next();
  });
};

module.exports = {
  handleExcelUpload
};
