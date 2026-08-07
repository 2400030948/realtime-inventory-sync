const express = require('express');
const router = express.Router();
const { getProducts, createProduct, adjustStock } = require('../controllers/inventoryController');

router.route('/').get(getProducts).post(createProduct);
router.route('/:id/adjust').patch(adjustStock);

module.exports = router;
