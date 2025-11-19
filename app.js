import express from "express";
import mysql2 from "mysql2";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
app.set("view engine", "ejs");

const PORT = 3500;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Create database connection pool
const pool = mysql2
	.createPool({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		port: process.env.DB_PORT,
	})
	.promise();

// ----------------------- ROUTES ----------------------- //

// Home page (order form)
app.get("/", (req, res) => {
	res.render("home");
});

// Database test route
app.get("/db-test", async (req, res) => {
	try {
		const [orders] = await pool.query(`SELECT * FROM orders`);
		res.send(orders);
	} catch (err) {
		console.error("Database error:", err);
		res.status(500).send("Database error: " + err.message);
	}
});

// Admin page (show all orders)
app.get("/admin", async (req, res) => {
	try {
		const [orders] = await pool.query(
			"SELECT * FROM orders ORDER BY timestamp DESC"
		);
		res.render("admin", { orders });
	} catch (err) {
		console.error("Database error:", err);
		res.status(500).send("Error fetching orders");
	}
});

// Confirm page (handles form submission)
app.post("/confirm", async (req, res) => {
	const order = req.body;

	// Ensure toppings is an array
	const toppingsArray = Array.isArray(order.toppings)
		? order.toppings
		: order.toppings
		? [order.toppings]
		: ["No toppings"];

	// Convert toppings to string for DB
	const toppingsStr = toppingsArray.join(", ");

	try {
		// SQL insert
		const sql = `INSERT INTO orders (customer, email, flavor, cone, toppings) VALUES (?, ?, ?, ?, ?)`;
		const params = [
			order.customer,
			order.email,
			order.flavor,
			order.cone,
			toppingsStr,
		];

		const [result] = await pool.execute(sql, params);
		console.log("Order saved with ID:", result.insertId);

		// Pass array to template for forEach
		order.toppings = toppingsArray;
		order.id = result.insertId;
		order.timestamp = new Date();

		res.render("confirm", { order });
	} catch (err) {
		console.error("Error saving order", err);
		res
			.status(500)
			.send(
				"Sorry, there was an error processing your order, please try again later."
			);
	}
});

// ----------------------- START SERVER ----------------------- //
app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
