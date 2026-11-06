import { BrowserRouter, Routes, Route } from "react-router";
import Home from "./pages/Home"
import Products from "./pages/Products"
import Cart from "./pages/Cart"
import Navbar from "./Components/Navbar"
import Footer from "./Components/Footer";
import ProductDetails from "./pages/ProductDetails";
import Profile from "./pages/Profile";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Checkout from "./pages/Checkout";
import Admin from "./pages/Admin";
import { CartProvider } from "./contexts/CartContext"
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background pt-16 text-text-main">
      <CartProvider><AuthProvider>
        <BrowserRouter>
          <Navbar />
          <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/Login" element={<Login />} />
            <Route path="/Signup" element={<Signup />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          </div>
          <Footer />
        </BrowserRouter>
      </AuthProvider></CartProvider>
    </div>
  );
}

export default App;
