import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";

let io: SocketIOServer | null = null;
const userSockets = new Map<number, Set<string>>();

export const initializeSocket = (httpServer: HTTPServer) => {
	io = new SocketIOServer(httpServer, {
		cors: {
			origin: process.env.FRONTEND_URL || "http://localhost:3001",
			methods: ["GET", "POST"],
			credentials: true,
		},
		transports: ["websocket", "polling"],
	});

	io.on("connection", (socket: Socket) => {
		console.log("Backend: New socket connection from frontend:", socket.id);

		socket.on("user:join", (userId: number) => {
			console.log(`Backend: User ${userId} joined notifications`);
			if (!userSockets.has(userId)) {
				userSockets.set(userId, new Set());
			}
			userSockets.get(userId)?.add(socket.id);
			socket.join(`user:${userId}`);
		});

		socket.on("disconnect", () => {
			console.log("Backend: Socket disconnected:", socket.id);
			userSockets.forEach((sockets) => {
				sockets.delete(socket.id);
			});
		});
	});

	return io;
};

export const broadcastNotification = async (
	userId: number,
	notification: any
) => {
	if (!io) {
		console.error("Backend: Socket.IO not initialized");
		return;
	}

	console.log(
		`Backend: Broadcasting notification to user ${userId}:`,
		notification
	);
	io.to(`user:${userId}`).emit("notification:new", notification);
};

export const getIO = () => io;
