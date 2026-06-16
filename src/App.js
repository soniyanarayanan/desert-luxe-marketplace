import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './App.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_KEY);
const categories = ["All", "Beverages", "Condiments", "Confections", "Dairy Products", "Grains/Cereals", "Meat/Poultry", "Produce", "Seafood"];
const emojis = ["🛋️", "🏺", "🕯️", "🪞", "🖼️", "🪴", "🎨", "🪔", "✨", "🌹"];

function CheckoutForm({ cart, cartTotal, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");
    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: { name, email, address: { line1: address } },
      });
      if (stripeError) { setError(stripeError.message); setLoading(false); return; }
      setTimeout(() => {
        setLoading(false);
        onSuccess({
          orderId: "ORD-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
          paymentId: paymentMethod.id, name, email, total: cartTotal, items: cart,
        });
      }, 1500);
    } catch (err) {
      setError("Payment failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <h3>📦 Delivery Information</h3>
      <div className="form-group">
        <label>Full Name</label>
        <input type="text" placeholder="Soniya Narayanan" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Email Address</label>
        <input type="email" placeholder="soniya@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Delivery Address</label>
        <input type="text" placeholder="Kuwait City, Kuwait" value={address} onChange={e => setAddress(e.target.value)} required />
      </div>
      <h3>💳 Payment Details</h3>
      <div className="form-group">
        <label>Card Information</label>
        <div className="card-element-wrapper">
          <CardElement options={{ style: { base: { fontSize: '16px', color: '#2c2c2c', '::placeholder': { color: '#aaa' } }, invalid: { color: '#e53935' } } }} />
        </div>
        <p className="test-card-hint">🧪 Test card: 4242 4242 4242 4242 | Any future date | Any CVC</p>
      </div>
      {error && <div className="payment-error">❌ {error}</div>}
      <button type="submit" className="btn-primary btn-large pay-btn" disabled={!stripe || loading}>
        {loading ? "Processing... ⏳" : `Pay $${cartTotal.toFixed(2)} 💳`}
      </button>
    </form>
  );
}

function ProductCard({ product, onAddToCart, onToggleWishlist, isWishlisted, onClick }) {
  const price = parseFloat(product.UnitPrice || 29.99).toFixed(2);
  const emoji = emojis[product.ProductID % emojis.length];
  return (
    <div className="product-card">
      {product.UnitsInStock < 10 && <span className="badge">Low Stock</span>}
      <button className={`wishlist-btn ${isWishlisted ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); onToggleWishlist({ ...product, price, emoji }); }}>
        {isWishlisted ? "❤️" : "🤍"}
      </button>
      <div className="product-image" onClick={onClick}>{emoji}</div>
      <div className="product-info" onClick={onClick}>
        <p className="product-category">{product.Category?.CategoryName || "Home Decor"}</p>
        <h3 className="product-name">{product.ProductName}</h3>
        <div className="product-rating">⭐ {(4 + Math.random()).toFixed(1)} ({Math.floor(Math.random() * 200) + 10})</div>
        <div className="product-price">${price}</div>
      </div>
      <button className="add-to-cart" onClick={() => onAddToCart({ ...product, price, emoji })}>Add to Cart 🛒</button>
    </div>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notification, setNotification] = useState("");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    axios.get('https://services.odata.org/V3/Northwind/Northwind.svc/Products?$expand=Category&$format=json&$top=40')
      .then(res => { setProducts(res.data.value); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter(p => {
    const matchSearch = p.ProductName.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || p.Category?.CategoryName === category;
    return matchSearch && matchCategory;
  });

  const addToCart = (product) => {
    const existing = cart.find(item => item.ProductID === product.ProductID);
    if (existing) { setCart(cart.map(item => item.ProductID === product.ProductID ? { ...item, qty: item.qty + 1 } : item)); }
    else { setCart([...cart, { ...product, qty: 1 }]); }
    showNotification("Added to cart! 🛒");
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.ProductID !== id));
  const updateQty = (id, qty) => { if (qty === 0) { removeFromCart(id); return; } setCart(cart.map(item => item.ProductID === id ? { ...item, qty } : item)); };
  const toggleWishlist = (product) => {
    if (wishlist.find(item => item.ProductID === product.ProductID)) { setWishlist(wishlist.filter(item => item.ProductID !== product.ProductID)); showNotification("Removed from wishlist!"); }
    else { setWishlist([...wishlist, product]); showNotification("Added to wishlist! ❤️"); }
  };
  const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 2500); };
  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const handlePaymentSuccess = (orderDetails) => { setOrder(orderDetails); setCart([]); setPage("confirmation"); };
  const shippingTotal = cartTotal >= 50 ? cartTotal : cartTotal + 9.99;

  return (
    <div className="app">
      {notification && <div className="notification">{notification}</div>}

      <nav className="navbar">
        <div className="nav-logo" onClick={() => setPage("home")}>🏜️ Desert Luxe</div>
        <div className="nav-search">
          <input type="text" placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage("shop"); }} />
          <span className="search-icon">🔍</span>
        </div>
        <div className="nav-actions">
          <button onClick={() => setPage("wishlist")} className="nav-btn">❤️ <span>{wishlist.length}</span></button>
          <button onClick={() => setPage("cart")} className="nav-btn cart-btn">🛒 <span>{cartCount}</span></button>
        </div>
      </nav>

      <div className="category-bar">
        {categories.map(cat => (
          <button key={cat} className={`cat-btn ${category === cat ? "active" : ""}`} onClick={() => { setCategory(cat); setPage("shop"); }}>{cat}</button>
        ))}
      </div>

      {page === "home" && (
        <div>
          <div className="hero">
            <div className="hero-content">
              <h1>Transform Your Space Into a <span>Desert Sanctuary</span></h1>
              <p>Real OData products ✨ Secure Stripe payments 💳</p>
              <div className="hero-btns">
                <button className="btn-primary" onClick={() => setPage("shop")}>Shop Now 🛍️</button>
                <button className="btn-secondary" onClick={() => setPage("shop")}>View All</button>
              </div>
            </div>
            <div className="hero-image">🏜️✨🛋️</div>
          </div>
          <div className="features">
            <div className="feature">🚚 Free Shipping over $50</div>
            <div className="feature">💳 Secure Stripe Payment</div>
            <div className="feature">⭐ Real OData Products</div>
            <div className="feature">🔒 100% Secure Checkout</div>
          </div>
          <div className="section">
            <h2 className="section-title">✨ Featured Products</h2>
            {loading ? <div className="loading"><div className="spinner"></div><p>Loading OData products... 🏜️</p></div> : (
              <div className="products-grid">
                {products.slice(0, 8).map(product => (
                  <ProductCard key={product.ProductID} product={product} onAddToCart={addToCart} onToggleWishlist={toggleWishlist} isWishlisted={wishlist.find(item => item.ProductID === product.ProductID)} onClick={() => { setSelectedProduct(product); setPage("product"); }} />
                ))}
              </div>
            )}
          </div>
          <div className="banner">
            <h2>🏜️ Desert Luxe Collection</h2>
            <p>Real products • Secure payments • Fast delivery</p>
            <button className="btn-primary" onClick={() => setPage("shop")}>Explore Now</button>
          </div>
        </div>
      )}

      {page === "shop" && (
        <div className="section">
          <h2 className="section-title">{category === "All" ? "All Products" : category}<span className="product-count"> ({filteredProducts.length} items)</span></h2>
          {loading ? <div className="loading"><div className="spinner"></div><p>Loading... 🏜️</p></div> : filteredProducts.length === 0 ? (
            <div className="empty-state"><p>😔 No products found!</p><button className="btn-primary" onClick={() => { setSearch(""); setCategory("All"); }}>Clear Search</button></div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map(product => (
                <ProductCard key={product.ProductID} product={product} onAddToCart={addToCart} onToggleWishlist={toggleWishlist} isWishlisted={wishlist.find(item => item.ProductID === product.ProductID)} onClick={() => { setSelectedProduct(product); setPage("product"); }} />
              ))}
            </div>
          )}
        </div>
      )}

      {page === "product" && selectedProduct && (
        <div className="product-detail">
          <button className="back-btn" onClick={() => setPage("shop")}>← Back to Shop</button>
          <div className="detail-content">
            <div className="detail-image">{emojis[selectedProduct.ProductID % emojis.length]}</div>
            <div className="detail-info">
              <span className="badge">{selectedProduct.Category?.CategoryName}</span>
              <h1>{selectedProduct.ProductName}</h1>
              <div className="detail-rating">⭐ 4.8 (124 reviews)</div>
              <div className="detail-price">${parseFloat(selectedProduct.UnitPrice || 29.99).toFixed(2)}</div>
              <div className="detail-meta">
                <p>📦 In Stock: {selectedProduct.UnitsInStock} units</p>
                <p>📦 Per Order: {selectedProduct.QuantityPerUnit}</p>
              </div>
              <p className="detail-desc">Discover the elegance of {selectedProduct.ProductName}. Perfect for your home! 🏜️✨</p>
              <div className="detail-actions">
                <button className="btn-primary btn-large" onClick={() => addToCart({ ...selectedProduct, price: parseFloat(selectedProduct.UnitPrice || 29.99).toFixed(2), emoji: emojis[selectedProduct.ProductID % emojis.length] })}>Add to Cart 🛒</button>
                <button className={`btn-wishlist ${wishlist.find(item => item.ProductID === selectedProduct.ProductID) ? "active" : ""}`} onClick={() => toggleWishlist(selectedProduct)}>
                  {wishlist.find(item => item.ProductID === selectedProduct.ProductID) ? "❤️ Wishlisted" : "🤍 Add to Wishlist"}
                </button>
              </div>
              <div className="detail-features">
                <div>✅ Secure Stripe payment</div>
                <div>✅ Free shipping over $50</div>
                <div>✅ 30-day returns</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {page === "cart" && (
        <div className="cart-page">
          <h2>🛒 Shopping Cart ({cartCount} items)</h2>
          {cart.length === 0 ? (
            <div className="empty-state"><p>🛒 Your cart is empty!</p><button className="btn-primary" onClick={() => setPage("shop")}>Start Shopping</button></div>
          ) : (
            <div className="cart-content">
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.ProductID} className="cart-item">
                    <div className="cart-item-image">{item.emoji || "🛋️"}</div>
                    <div className="cart-item-info"><h3>{item.ProductName}</h3><p>${item.price}</p></div>
                    <div className="cart-item-qty">
                      <button onClick={() => updateQty(item.ProductID, item.qty - 1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.ProductID, item.qty + 1)}>+</button>
                    </div>
                    <div className="cart-item-total">${(parseFloat(item.price) * item.qty).toFixed(2)}</div>
                    <button className="remove-btn" onClick={() => removeFromCart(item.ProductID)}>🗑️</button>
                  </div>
                ))}
              </div>
              <div className="cart-summary">
                <h3>Order Summary</h3>
                <div className="summary-row"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
                <div className="summary-row"><span>Shipping</span><span>{cartTotal >= 50 ? "FREE 🎉" : "$9.99"}</span></div>
                <div className="summary-row total"><span>Total</span><span>${shippingTotal.toFixed(2)}</span></div>
                {cartTotal < 50 && <p className="free-shipping-msg">Add ${(50 - cartTotal).toFixed(2)} more for FREE shipping! 🚚</p>}
                <button className="btn-primary btn-large checkout-btn" onClick={() => setPage("checkout")}>Proceed to Checkout 💳</button>
                <button className="btn-secondary" onClick={() => setPage("shop")}>Continue Shopping</button>
              </div>
            </div>
          )}
        </div>
      )}

      {page === "checkout" && (
        <div className="checkout-page">
          <button className="back-btn" onClick={() => setPage("cart")}>← Back to Cart</button>
          <h2>💳 Secure Checkout</h2>
          <div className="checkout-content">
            <Elements stripe={stripePromise}>
              <CheckoutForm cart={cart} cartTotal={shippingTotal} onSuccess={handlePaymentSuccess} />
            </Elements>
            <div className="order-summary-checkout">
              <h3>🛒 Order Summary</h3>
              {cart.map(item => (
                <div key={item.ProductID} className="summary-item">
                  <span>{item.emoji} {item.ProductName} x{item.qty}</span>
                  <span>${(parseFloat(item.price) * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="summary-divider"></div>
              <div className="summary-row"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
              <div className="summary-row"><span>Shipping</span><span>{cartTotal >= 50 ? "FREE 🎉" : "$9.99"}</span></div>
              <div className="summary-row total"><span>Total</span><span>${shippingTotal.toFixed(2)}</span></div>
              <div className="secure-badges"><p>🔒 SSL Secured</p><p>💳 Powered by Stripe</p><p>✅ Safe & Encrypted</p></div>
            </div>
          </div>
        </div>
      )}

      {page === "confirmation" && order && (
        <div className="confirmation-page">
          <div className="confirmation-card">
            <div className="confirmation-icon">🎉</div>
            <h2>Order Confirmed!</h2>
            <p className="confirmation-subtitle">Thank you for shopping with Desert Luxe! 🏜️✨</p>
            <div className="order-details">
              <div className="order-row"><span>Order ID:</span><strong>{order.orderId}</strong></div>
              <div className="order-row"><span>Name:</span><strong>{order.name}</strong></div>
              <div className="order-row"><span>Email:</span><strong>{order.email}</strong></div>
              <div className="order-row"><span>Total Paid:</span><strong>${parseFloat(order.total).toFixed(2)}</strong></div>
              <div className="order-row"><span>Status:</span><strong style={{color: "#107e3e"}}>✅ Payment Successful</strong></div>
            </div>
            <div className="ordered-items">
              <h3>Items Ordered:</h3>
              {order.items.map(item => (
                <div key={item.ProductID} className="ordered-item">
                  <span>{item.emoji} {item.ProductName} x{item.qty}</span>
                  <span>${(parseFloat(item.price) * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="confirmation-email">📧 Confirmation sent to {order.email}</p>
            <button className="btn-primary btn-large" onClick={() => setPage("home")}>Continue Shopping 🛍️</button>
          </div>
        </div>
      )}

      {page === "wishlist" && (
        <div className="section">
          <h2 className="section-title">❤️ My Wishlist ({wishlist.length} items)</h2>
          {wishlist.length === 0 ? (
            <div className="empty-state"><p>❤️ Your wishlist is empty!</p><button className="btn-primary" onClick={() => setPage("shop")}>Start Shopping</button></div>
          ) : (
            <div className="products-grid">
              {wishlist.map(product => (
                <ProductCard key={product.ProductID} product={product} onAddToCart={addToCart} onToggleWishlist={toggleWishlist} isWishlisted={true} onClick={() => { setSelectedProduct(product); setPage("product"); }} />
              ))}
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand"><h3>🏜️ Desert Luxe</h3><p>Powered by OData & Stripe 💳</p></div>
          <div className="footer-links"><h4>Shop</h4><p onClick={() => setPage("shop")}>All Products</p><p onClick={() => setPage("wishlist")}>Wishlist</p></div>
          <div className="footer-links"><h4>Help</h4><p>Contact Us</p><p>Returns</p></div>
          <div className="footer-links"><h4>Payment</h4><p>💳 Stripe Secured</p><p>🔒 SSL Encrypted</p></div>
        </div>
        <div className="footer-bottom"><p>© 2026 Desert Luxe Microspaces — Built with React by Soniya Narayanan 💛</p></div>
      </footer>
    </div>
  );
}

export default App;