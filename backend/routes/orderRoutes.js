const express = require('express');
const router = express.Router();
const { placeOrder, getOrders } = require('../controllers/orderController');

router.route('/').get(getOrders).post(placeOrder);

module.exports = router;
