import fs from "fs";
import { type NextRequest, NextResponse } from "next/server";
import path from "path";
import { getHtmlPath, getMarkdownPath, hasHtmlExport } from "@/lib/config";

const MIME_TYPES: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
};

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const imagePath = searchParams.get("path");

	if (!imagePath) {
		return NextResponse.json(
			{ error: "Missing path parameter" },
			{ status: 400 },
		);
	}

	const markdownPath = getMarkdownPath();
	const decodedPath = decodeURIComponent(imagePath);

	// Try markdown path first (where most images are), then HTML path if available
	let fullPath = path.join(markdownPath, decodedPath);

	if (!fs.existsSync(fullPath) && hasHtmlExport()) {
		const htmlPath = getHtmlPath();
		fullPath = path.join(htmlPath, decodedPath);
	}

	// Security check: ensure the path is within one of the workspace directories
	const resolvedPath = path.resolve(fullPath);
	const resolvedMarkdownPath = path.resolve(markdownPath);

	let isValidPath = resolvedPath.startsWith(resolvedMarkdownPath);
	if (!isValidPath && hasHtmlExport()) {
		const resolvedHtmlPath = path.resolve(getHtmlPath());
		isValidPath = resolvedPath.startsWith(resolvedHtmlPath);
	}

	if (!isValidPath) {
		return NextResponse.json({ error: "Invalid path" }, { status: 403 });
	}

	if (!fs.existsSync(resolvedPath)) {
		return NextResponse.json({ error: "Image not found" }, { status: 404 });
	}

	const ext = path.extname(resolvedPath).toLowerCase();
	const mimeType = MIME_TYPES[ext] || "application/octet-stream";

	const fileBuffer = fs.readFileSync(resolvedPath);

	return new NextResponse(fileBuffer, {
		headers: {
			"Content-Type": mimeType,
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
