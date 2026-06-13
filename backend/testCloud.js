require('dotenv').config(); // <-- IMPORTANTE

const cloudinary = require('./src/config/cloudinary');

(async () => {
  try {
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', process.env.CLOUDINARY_API_KEY);
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' : 'NO DEFINIDO');
    
    const res = await cloudinary.api.ping();
    console.log('✅ Cloudinary OK:', res);
  } catch (e) {
    console.error('❌ Cloudinary Error:', e.message || e);
  }
})();
