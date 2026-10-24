const express = require("express")
const cors = require("cors");
const session = require("express-session");

const productRoute = require("./routes/products/productsRoute");
const userRoute = require("./routes/users/userRoute");
const orderRoute = require("./routes/order/orderRoute");
const addressRoute = require("./routes/address/addressRoute");

const app = express();

app.set('trust proxy', 1)

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://salebeast.netlify.app"
    ],
    credentials: true
}));

app.use(express.json())

app.use(session({
    secret: 'test',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 60,
        sameSite: 'none',
        secure: true
    }
}))

app.use('/api/products', productRoute)
app.use('/api/user', userRoute)
app.use('/api/order', orderRoute)
app.use('/api/address', addressRoute)

app.get("/api/products", async (req, res) => {
    res.json({ message: "success" })
})

app.use('/images', express.static('product_images'))



app.listen(5000, () => {
    console.log("listening on port: 5000");
})