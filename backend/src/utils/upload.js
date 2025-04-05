const cloudinary = require('cloudinary').v2
const multer = require('multer')
const path = require('path')
const config = require('../config')
const ErrorResponse = require('./errorResponse')

// Configure cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
})

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

// File filter function for multer
const fileFilter = (req, file, cb) => {
  // Check file type
  const filetypes = /jpeg|jpg|png|gif/
  const mimetype = filetypes.test(file.mimetype)
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

  if (mimetype && extname) {
    return cb(null, true)
  }

  cb(new ErrorResponse('Only image files are allowed!', 400), false)
}

// Create multer upload object
const upload = multer({
  storage: storage,
  limits: {fileSize: 1024 * 1024 * 5}, // 5MB
  fileFilter: fileFilter,
})

// Function to upload file to cloudinary
const uploadToCloudinary = async (file, folder) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder || 'dumpit',
      resource_type: 'auto',
    })

    return {
      public_id: result.public_id,
      url: result.secure_url,
    }
  } catch (error) {
    throw new ErrorResponse('Error uploading to Cloudinary', 500)
  }
}

// Function to delete file from cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result
  } catch (error) {
    throw new ErrorResponse('Error deleting from Cloudinary', 500)
  }
}

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
}
