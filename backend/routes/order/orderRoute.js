const express = require('express')
const router = express.Router()

const {
  GetOrders,
  PlaceOrder
} = require('./orderController.js')



router.get('/', GetOrders)
router.post('/place', PlaceOrder)

module.exports = router