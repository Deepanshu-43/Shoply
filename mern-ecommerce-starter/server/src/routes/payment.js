import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';

const router = Router();

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (key_id && key_secret && key_id !== 'rzp_test_your_key_id') {
    return new Razorpay({ key_id, key_secret });
  }
  return null;
}

// GET /api/payment/key
router.get('/key', (_req, res) => {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKey';
  const isMock = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_your_key_id';
  res.json({ key: key_id, isMock });
});

// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { items, customer, amount } = req.body;

    if (!items || !items.length || !amount || !customer) {
      return res.status(400).json({ message: 'Invalid order data.' });
    }

    const razorpay = getRazorpayInstance();
    let razorpayOrderId = '';

    if (razorpay) {
      // Amount in paise (1 INR = 100 paise)
      const options = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`
      };
      const rzpOrder = await razorpay.orders.create(options);
      razorpayOrderId = rzpOrder.id;
    } else {
      // Mock order ID when Razorpay keys are not provided
      razorpayOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const order = await Order.create({
      customer,
      items: items.map((i) => ({
        product: i._id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        image: i.image
      })),
      totalAmount: amount,
      currency: 'INR',
      razorpayOrderId,
      status: 'created'
    });

    res.json({
      success: true,
      orderId: order._id,
      razorpayOrderId,
      amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKey',
      isMock: !Boolean(razorpay)
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Could not initiate payment order.' });
  }
});

// POST /api/payment/verify
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      dbOrderId
    } = req.body;

    const order = await Order.findById(dbOrderId);
    if (!order) {
      return res.status(404).json({ message: 'Order record not found.' });
    }

    const razorpay = getRazorpayInstance();

    if (razorpay) {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        order.status = 'failed';
        await order.save();
        return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
      }
    }

    // Mark order as paid
    order.status = 'paid';
    order.razorpayPaymentId = razorpay_payment_id || `pay_mock_${Date.now()}`;
    order.razorpaySignature = razorpay_signature || 'mock_signature_valid';
    await order.save();

    res.json({
      success: true,
      message: 'Payment verified and order confirmed!',
      order
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Payment verification failed.' });
  }
});

// GET /api/payment/orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    res.json(order);
  } catch {
    res.status(400).json({ message: 'Invalid order ID.' });
  }
});

export default router;
