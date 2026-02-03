import fs from "fs";
import path from "path";
import { getHtmlPath, getMarkdownPath, hasHtmlExport } from "../config";

/**
 * Extract the page icon from an HTML file.
 * Icons can be either:
 * - Emoji: `<span class="icon">📠</span>`
 * - Image: `<img class="icon" src="...">`
 */
export function extractPageIcon(htmlPath: string): string | null {
	if (!fs.existsSync(htmlPath)) {
		return null;
	}

	const html = fs.readFileSync(htmlPath, "utf-8");

	// Try emoji icon first: <span class="icon">📠</span>
	const emojiMatch = html.match(/<span\s+class="icon">([^<]+)<\/span>/);
	if (emojiMatch) {
		return emojiMatch[1].trim();
	}

	// Try image icon: <img class="icon" src="...">
	const imgMatch = html.match(/<img\s+class="icon"[^>]*src="([^"]+)"/);
	if (imgMatch) {
		// Return the image path relative to the HTML file
		return imgMatch[1];
	}

	return null;
}

/**
 * Find the corresponding HTML file for a markdown file path.
 * Swaps the base directory and extension.
 */
export function findHtmlFile(markdownFilePath: string): string | null {
	if (!hasHtmlExport()) {
		return null;
	}

	const markdownBase = getMarkdownPath();
	const htmlBase = getHtmlPath();

	// Get relative path from markdown base
	const relativePath = markdownFilePath.startsWith(markdownBase)
		? markdownFilePath.slice(markdownBase.length)
		: markdownFilePath;

	// Swap .md extension to .html
	const htmlRelativePath = relativePath.replace(/\.md$/, ".html");
	const htmlFullPath = path.join(htmlBase, htmlRelativePath);

	if (fs.existsSync(htmlFullPath)) {
		return htmlFullPath;
	}

	return null;
}

/**
 * Notion color classes to CSS color values mapping
 */
export const NOTION_COLORS: Record<string, { bg: string; text: string }> = {
	default: { bg: "bg-neutral-500/20", text: "text-neutral-300" },
	gray: { bg: "bg-neutral-500/20", text: "text-neutral-300" },
	brown: { bg: "bg-amber-900/30", text: "text-amber-300" },
	orange: { bg: "bg-orange-500/20", text: "text-orange-300" },
	yellow: { bg: "bg-yellow-500/20", text: "text-yellow-300" },
	green: { bg: "bg-green-500/20", text: "text-green-300" },
	blue: { bg: "bg-blue-500/20", text: "text-blue-300" },
	purple: { bg: "bg-purple-500/20", text: "text-purple-300" },
	pink: { bg: "bg-pink-500/20", text: "text-pink-300" },
	red: { bg: "bg-red-500/20", text: "text-red-300" },
};

/**
 * Extract property colors from an HTML file.
 * Looks for select-value-color-* classes in the HTML.
 * Returns a map of property value -> color name
 */
export function extractPropertyColors(htmlPath: string): Map<string, string> {
	const colors = new Map<string, string>();

	if (!fs.existsSync(htmlPath)) {
		return colors;
	}

	const html = fs.readFileSync(htmlPath, "utf-8");

	// Match patterns like: <span class="... select-value-color-blue">Value</span>
	const regex =
		/<span[^>]*class="[^"]*select-value-color-(\w+)[^"]*"[^>]*>([^<]+)<\/span>/g;
	let match;

	while ((match = regex.exec(html)) !== null) {
		const color = match[1];
		const value = match[2].trim();
		if (value && color) {
			colors.set(value, color);
		}
	}

	return colors;
}

/**
 * Find the HTML file for a CSV file path.
 * CSV files in HTML export have a corresponding .html file that contains the table view.
 */
export function findHtmlFileForCsv(csvFilePath: string): string | null {
	if (!hasHtmlExport()) {
		return null;
	}

	const markdownBase = getMarkdownPath();
	const htmlBase = getHtmlPath();

	// Get relative path from markdown base
	const relativePath = csvFilePath.startsWith(markdownBase)
		? csvFilePath.slice(markdownBase.length)
		: csvFilePath;

	// For CSVs, the HTML file might be in a folder with the same name
	// e.g., "Database.csv" → "Database/Database.html" or "Database.html"
	const baseName = path.basename(relativePath, ".csv");
	const dirName = path.dirname(relativePath);

	// Try direct .html replacement first
	const directHtmlPath = path.join(htmlBase, dirName, `${baseName}.html`);
	if (fs.existsSync(directHtmlPath)) {
		return directHtmlPath;
	}

	// Try folder structure: Database/Database.html
	const folderHtmlPath = path.join(
		htmlBase,
		dirName,
		baseName,
		`${baseName}.html`,
	);
	if (fs.existsSync(folderHtmlPath)) {
		return folderHtmlPath;
	}

	return null;
}
