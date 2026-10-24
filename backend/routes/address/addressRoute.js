const express = require('express')
const router = express.Router()

const {
  GetGovernorate,
  GetArea
} = require('./addressController.js')



router.get('/governorate', GetGovernorate)
router.get('/area', GetArea)

module.exports = router