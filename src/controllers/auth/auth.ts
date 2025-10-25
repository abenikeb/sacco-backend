import { jwtVerify, SignJWT } from "jose";
import type { UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import * as cookie from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export type JWTPayload = {
	id?: number;
	email?: string;
	name?: string;
	role: UserRole | "MEMBER";
	etNumber?: number;
	phone?: string;
};

export async function signJWT(payload: JWTPayload): Promise<string> {
	const token = await new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("24h")
		.sign(secretKey);

	return token;
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
	try {
		const { payload } = await jwtVerify(token, secretKey);
		console.log(payload);
		return payload as JWTPayload;
	} catch (error) {
		console.error("Auth: JWT verification failed", error);
		return null;
	}
}

export async function getSession(req: Request): Promise<JWTPayload | null> {
	const cookies = req.cookies || "";
	const token = (cookies as any).token;
	if (!token) return null;
	return verifyJWT(token);
}

export function setAuthCookie(token: string, res: Response): Response {
	const isProduction = process.env.NODE_ENV === "production";

	return res.setHeader(
		"Set-Cookie",
		cookie.serialize("token", token, {
			httpOnly: true,
			path: "/",
			maxAge: 60 * 60 * 24, // 1 day
			sameSite: "lax", // 'none' only for HTTPS
			secure: false, // must be true only in HTTPS
		})
	);
}
 
// export function setAuthCookie(token: string, res: Response): Response {
// 	return res.setHeader(
// 		"Set-Cookie",
// 		cookie.serialize("token", token, {
// 			httpOnly: true,
// 			path: "/",
// 			maxAge: 60 * 60 * 24,
// 			sameSite: "none",
// 			secure: false,
// 		})
// 	);
// }

export function removeAuthCookie(res: Response): Response {
	const serializedCookie = cookie.serialize("token", "", {
		secure: false,
		httpOnly: true,
		path: "/",
		maxAge: 0,
		sameSite: "lax",
	});
	res.setHeader("Set-Cookie", serializedCookie);
	return res;
}

export function getTokenFromRequest(req: Request): string | null {
	const authHeader = req.headers.authorization;
	const token = authHeader?.startsWith("Bearer ")
		? authHeader.split(" ")[1]
		: null;

	return token || null;
}

export async function getUserFromRequest(
	request: Request
): Promise<JWTPayload | null> {
	const token = getTokenFromRequest(request);
	if (!token) return null;

	return verifyJWT(token);
}

export function hasRequiredRole(
	user: JWTPayload | null,
	requiredRoles: (UserRole | "MEMBER")[]
): boolean {
	if (!user) return false;
	const hasRole = requiredRoles.includes(user.role as UserRole);
	console.log(
		"Auth: Checking role",
		user.role,
		"against",
		requiredRoles,
		"Result:",
		hasRole
	);
	return hasRole;
}
