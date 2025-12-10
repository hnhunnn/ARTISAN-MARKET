// src/backend/server.js
const express = require('express');
const app = express();
const cors = require('cors');
// === CHỖ NÀY QUAN TRỌNG: Thay mã Secret Key của bạn vào đây ===
// Mã bắt đầu bằng "sk_test_..." lấy từ Stripe Dashboard
const stripe = require('stripe')('');

app.use(cors());
app.use(express.json());

// API để App gọi tới xin phiếu thanh toán
app.post('/payment-sheet', async (req, res) => {
  try {
    const { amount } = req.body;

    // 1. Tạo khách hàng
    const customer = await stripe.customers.create();

    // 2. Tạo khóa tạm thời
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2022-11-15' },
    );

    // 3. Tạo yêu cầu thanh toán (PaymentIntent)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'vnd', // Đơn vị tiền tệ Việt Nam
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
    });

    // 4. Gửi kết quả về cho App
    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
    });
  } catch (e) {
    console.error('Lỗi Server:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// Chạy server tại cổng 3000
app.listen(3000, () => {
  console.log('✅ Server Backend đang chạy tại cổng 3000...');
});
