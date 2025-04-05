const express = require('express')
const {getAddresses, getAddress, createAddress, updateAddress, deleteAddress} = require('../controllers/addresses')

const {protect} = require('../middleware/auth')

// Validation
const validateRequest = require('../middleware/validator')
const {addressSchema} = require('../validations/address')

const router = express.Router({mergeParams: true})

// Protect all routes
router.use(protect)

// Get all addresses
router.get('/', getAddresses)

// Create address
router.post('/', validateRequest(addressSchema), createAddress)

// Get single address
router.get('/:id', getAddress)

// Update address
router.put('/:id', validateRequest(addressSchema), updateAddress)

// Delete address
router.delete('/:id', deleteAddress)

module.exports = router
