const express = require('express')
const router = express.Router()

const {
  GetOrders,
  ValidateVoucher,
  PlaceOrder
} = require('./orderController.js')



router.get('/', GetOrders)
router.post('/voucher', ValidateVoucher)
router.post('/place', PlaceOrder)

module.exports = router
