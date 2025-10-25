import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initializeSocket } from "@/src/utils/socket-handler";
import apiRoutes from "./routes";
const app = express();

const server = http.createServer(app);
initializeSocket(server);


app.use(
	cors({
		origin: process.env.FRONTEND_URL || "http://94.130.27.32:38443",
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"Cache-Control",
			"Expires",
			"Pragma",
		],
	})
);

app.use(express.json());
app.use(cookieParser());


app.get("/health-check", (req, res) => {
	res.json({ message: "Server is running" });
});

app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
	console.log(`Socket.IO server initialized and listening for connections`);
});

export default app;
