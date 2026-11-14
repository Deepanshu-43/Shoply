import { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingBag, Plus, Minus, X, ArrowRight, CheckCircle2, CreditCard, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '/api';
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function App() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [error, setError] = useState('');

  // Checkout & Payment State
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '9876543210',
    address: '221B Baker Street, Flat 4A'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [gatewayInfo, setGatewayInfo] = useState({ isMock: true, key: '' });

  useEffect(() => {
    fetch(`${API}/products`)
      .then((res) => { if (!res.ok) throw new Error('API unavailable'); return res.json(); })
      .then(setProducts)
      .catch(() => setError('Could not connect to the shop API. Start the server and MongoDB, then refresh.'));

    fetch(`${API}/payment/key`)
      .then((res) => res.json())
      .then(setGatewayInfo)
      .catch(() => {});
  }, []);

  const categories = ['All', ...new Set(products.map((p) => p.category))];
  const visibleProducts = useMemo(() => products.filter((p) =>
    (category === 'All' || p.category === category) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  ), [products, category, search]);

  const addToCart = (product) => setCart((current) => {
    const found = current.find((item) => item._id === product._id);
    return found ? current.map((item) => item._id === product._id ? { ...item, qty: item.qty + 1 } : item)
      : [...current, { ...product, qty: 1 }];
  });

  const changeQty = (id, amount) => setCart((items) => items
    .map((item) => item._id === id ? { ...item, qty: item.qty + amount } : item)
    .filter((item) => item.qty > 0));

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  const startCheckout = () => {
    setCartOpen(false);
    setPaymentError('');
    setCheckoutOpen(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!customer.name || !customer.email || !customer.phone) {
      setPaymentError('Please fill in all required customer details.');
      return;
    }

    setIsProcessing(true);
    setPaymentError('');

    try {
      // 1. Create order on the backend
      const res = await fetch(`${API}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customer,
          amount: total
        })
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.message || 'Failed to initialize payment order.');
      }

      const { orderId, razorpayOrderId, amount, currency, key, isMock } = orderData;

      // 2. Complete payment (Real Razorpay Modal OR Simulated Test Mode)
      if (!isMock && window.Razorpay && key && !key.startsWith('rzp_test_mock')) {
        const options = {
          key,
          amount: Math.round(amount * 100),
          currency: currency || 'INR',
          name: 'Shoply',
          description: `Order #${orderId.slice(-6)}`,
          order_id: razorpayOrderId,
          prefill: {
            name: customer.name,
            email: customer.email,
            contact: customer.phone
          },
          theme: {
            color: '#2d4232'
          },
          handler: async function (response) {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              dbOrderId: orderId
            });
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setPaymentError(resp.error?.description || 'Payment was declined.');
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        // Fallback / Test Mode Gateway Simulation
        // Simulates realistic Razorpay authorization and verifies on the backend
        setTimeout(async () => {
          await verifyPayment({
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: `pay_test_${Date.now()}`,
            razorpay_signature: 'test_signature_valid',
            dbOrderId: orderId
          });
        }, 1200);
      }
    } catch (err) {
      setPaymentError(err.message || 'Payment could not be completed.');
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (verificationPayload) => {
    try {
      const verifyRes = await fetch(`${API}/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationPayload)
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || 'Payment verification failed.');
      }

      setCart([]);
      setCheckoutOpen(false);
      setOrderReceipt(verifyData.order);
    } catch (err) {
      setPaymentError(err.message || 'Payment verification failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app">
      <div className="announcement">A little something for your everyday ✦ Free shipping on orders over ₹2,000</div>
      <header className="header">
        <a className="brand" href="#"><span className="brand-mark">s</span> shoply<span className="dot">.</span></a>
        <nav><a href="#shop">Shop</a><a href="#story">Our story</a><a href="#footer">Contact</a></nav>
        <button className="cart-button" onClick={() => setCartOpen(true)} aria-label="Open cart">
          <ShoppingBag size={20} /><span>Bag</span><b>{count}</b>
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">THE EVERYDAY EDIT — 2026</p>
            <h1>Good things.<br /><em>Better days.</em></h1>
            <p className="hero-text">Thoughtfully picked essentials that make your everyday feel a little more special.</p>
            <a className="primary-button" href="#shop">Explore the collection <ArrowRight size={17} /></a>
          </div>
          <div className="hero-image">
            <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85" alt="Bright retail store" />
          </div>
          <div className="hero-note">FIND YOUR<br />NEW FAVORITE <span>↘</span></div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div><p className="eyebrow">CURATED FOR YOU</p><h2>Shop the collection</h2></div>
            <label className="search">
              <Search size={18} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find something..." />
            </label>
          </div>
          <div className="filters">
            {categories.map((item) => (
              <button key={item} className={category === item ? 'filter active' : 'filter'} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="product-grid">
            {visibleProducts.map((product, index) => (
              <article className="product" key={product._id}>
                <div className="product-image">
                  <img src={product.image} alt={product.name} loading="lazy" />
                  <span className="product-number">0{index + 1}</span>
                  <button className="add-button" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to bag`}>
                    <Plus size={20} />
                  </button>
                </div>
                <div className="product-info">
                  <div><h3>{product.name}</h3><p>{product.category}</p></div>
                  <strong>{money(product.price)}</strong>
                </div>
              </article>
            ))}
          </div>
          {!error && visibleProducts.length === 0 && <p className="empty">No products found. Try another search.</p>}
        </section>

        <section className="story" id="story">
          <p className="eyebrow">LESS, BUT LOVELIER</p>
          <h2>Make room for<br /><em>what matters.</em></h2>
          <p>We believe the best things aren't complicated. Just useful, beautiful, and made to be part of your story.</p>
        </section>
      </main>

      <footer id="footer">
        <a className="brand" href="#">shoply<span className="dot">.</span></a>
        <span>Little joys, delivered.</span>
        <span>© 2026 Shoply</span>
      </footer>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h2>Your bag <span>({count})</span></h2>
              <button onClick={() => setCartOpen(false)} aria-label="Close cart"><X /></button>
            </div>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingBag size={36} />
                <h3>Your bag is waiting</h3>
                <p>Add something lovely to get started.</p>
                <button className="primary-button" onClick={() => setCartOpen(false)}>Keep shopping</button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item._id}>
                      <img src={item.image} alt={item.name} />
                      <div className="cart-item-info">
                        <h3>{item.name}</h3>
                        <b>{money(item.price)}</b>
                        <div className="qty">
                          <button onClick={() => changeQty(item._id, -1)}><Minus size={14} /></button>
                          <span>{item.qty}</span>
                          <button onClick={() => changeQty(item._id, 1)}><Plus size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-bottom">
                  <div className="subtotal">
                    <span>Subtotal</span>
                    <strong>{money(total)}</strong>
                  </div>
                  <p>Shipping and taxes calculated at checkout.</p>
                  <button className="primary-button checkout" onClick={startCheckout}>
                    Continue to checkout <ArrowRight size={17} />
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="overlay" onClick={() => !isProcessing && setCheckoutOpen(false)} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Secure Checkout</h2>
              <button onClick={() => !isProcessing && setCheckoutOpen(false)} aria-label="Close checkout"><X size={20} /></button>
            </div>

            <div>
              {gatewayInfo.isMock ? (
                <span className="badge-test">⚡ Test Mode Active (Simulated Razorpay Gateway)</span>
              ) : (
                <span className="badge-live">🔒 Razorpay Live Gateway Connected</span>
              )}
            </div>

            {paymentError && <p className="error" style={{ padding: '8px', textAlign: 'left' }}>{paymentError}</p>}

            <form className="checkout-form" onSubmit={handlePayment}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  required
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  disabled={isProcessing}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="jane@example.com"
                    disabled={isProcessing}
                  />
                </div>
                <div className="form-group">
                  <label>Phone (UPI / SMS)</label>
                  <input
                    type="tel"
                    required
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="9876543210"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Delivery Address</label>
                <textarea
                  rows={2}
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder="House number, Street, City, Pin code"
                  disabled={isProcessing}
                />
              </div>

              <div className="order-summary-box">
                <div className="summary-row">
                  <span>Items ({count})</span>
                  <span>{money(total)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  <span>Free</span>
                </div>
                <div className="summary-total">
                  <span>Total Amount</span>
                  <span>{money(total)}</span>
                </div>
              </div>

              <div className="btn-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCheckoutOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="checkout-pay-btn"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard size={17} />
                      Pay {money(total)} via Razorpay
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirmation Receipt Modal */}
      {orderReceipt && (
        <div className="overlay" onClick={() => setOrderReceipt(null)} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-box">
              <div className="receipt-icon">
                <CheckCircle2 size={32} />
              </div>
              <h2>Payment Successful!</h2>
              <p>Thank you, {orderReceipt.customer.name}! Your order has been placed.</p>

              <div className="receipt-details">
                <div className="receipt-item">
                  <span>Order Reference</span>
                  <b>#{orderReceipt._id.slice(-8).toUpperCase()}</b>
                </div>
                <div className="receipt-item">
                  <span>Payment ID</span>
                  <b>{orderReceipt.razorpayPaymentId || 'Verified'}</b>
                </div>
                <div className="receipt-item">
                  <span>Payment Status</span>
                  <b style={{ color: '#2e7d32' }}>Paid ({orderReceipt.status.toUpperCase()})</b>
                </div>
                <div className="receipt-item">
                  <span>Items</span>
                  <b>{orderReceipt.items.map((i) => `${i.name} (×${i.qty})`).join(', ')}</b>
                </div>
                <div className="receipt-item">
                  <span>Amount Paid</span>
                  <b>{money(orderReceipt.totalAmount)}</b>
                </div>
                <div className="receipt-item">
                  <span>Delivering to</span>
                  <b>{orderReceipt.customer.address || 'Standard Delivery'}</b>
                </div>
              </div>

              <button className="primary-button" style={{ width: '100%' }} onClick={() => setOrderReceipt(null)}>
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
