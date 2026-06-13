const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gmtch_tune',
    resource_type: 'auto', // Esto es clave para archivos .bin
  },
});

const upload = multer({ storage });

module.exports = upload;
