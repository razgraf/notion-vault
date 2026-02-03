import fs from "fs";
import path from "path";
import { getHtmlPath, getMarkdownPath, hasHtmlExport } from "../config";

export interface NavNode {
	id: string;
	title: string;
	slug: string;
	filePath: string | null;
	isExternal: boolean;
	externalUrl?: string;
	isCsv: boolean;
	isInlineDb: boolean;
	icon?: string;
	children: NavNode[];
}

export interface WorkspaceData {
	id: string;
	name: string;
	tree: NavNode[];
}

function extractUuid(text: string): string {
	// Match UUID patterns like "bec6359f-fc06-463c-814f-8a2ee75b9e40" or "bec6359ffc06463c814f8a2ee75b9e40"
	const uuidMatch = text.match(
		/([a-f0-9]{8})-?([a-f0-9]{4})-?([a-f0-9]{4})-?([a-f0-9]{4})-?([a-f0-9]{12})/i,
	);
	if (uuidMatch) {
		return `${uuidMatch[1]}${uuidMatch[2]}${uuidMatch[3]}${uuidMatch[4]}${uuidMatch[5]}`.toLowerCase();
	}
	return "";
}

function extractShortUuid(text: string): string {
	const uuid = extractUuid(text);
	return uuid.slice(0, 8);
}

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function safeDecodeURIComponent(text: string): string {
	try {
		return decodeURIComponent(text);
	} catch {
		// If decoding fails, return the original text with basic cleanup
		return text.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
	}
}

function cleanTitle(text: string): string {
	// Remove UUID and file extensions from the title
	const cleaned = decodeHtmlEntities(text)
		// Remove file extension with UUID pattern: "Title abc123.html" or "Title abc123.md"
		.replace(/\s+[a-f0-9]{32}\.(md|csv|html)$/i, "")
		// Remove standalone UUID patterns
		.replace(
			/\s*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
			"",
		)
		.replace(/\s+[a-f0-9]{32}$/gi, "")
		// Remove file extensions at end
		.replace(/\.(md|csv|html)$/i, "")
		// Remove inline database suffix
		.replace(/\s*\(Inline database\)\s*$/i, "")
		.trim();

	return cleaned;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

function parseUlElement(
	html: string,
	startIndex: number,
): { node: NavNode | null; endIndex: number } {
	// Find the <ul> tag
	const ulMatch = html.slice(startIndex).match(/^<ul\s+id="id::([^"]*)"[^>]*>/);
	if (!ulMatch) {
		return { node: null, endIndex: startIndex };
	}

	const nodeId = ulMatch[1];
	let currentIndex = startIndex + ulMatch[0].length;
	let title = "";
	let filePath: string | null = null;
	let isExternal = false;
	let externalUrl: string | undefined;
	let isCsv = false;
	let isInlineDb = false;
	const children: NavNode[] = [];

	// Parse the content inside this <ul>
	while (currentIndex < html.length) {
		// Check for closing </ul>
		if (html.slice(currentIndex).startsWith("</ul>")) {
			currentIndex += 5; // length of '</ul>'
			break;
		}

		// Check for nested <li><ul>
		const liUlMatch = html.slice(currentIndex).match(/^<li><ul\s+id="id::/);
		if (liUlMatch) {
			currentIndex += 4; // skip <li>
			const result = parseUlElement(html, currentIndex);
			if (result.node) {
				children.push(result.node);
			}
			currentIndex = result.endIndex;
			// Skip </li> if present
			if (html.slice(currentIndex).startsWith("</li>")) {
				currentIndex += 5;
			}
			continue;
		}

		// Check for <a> tag with href (file link)
		const aHrefMatch = html
			.slice(currentIndex)
			.match(/^<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>/);
		if (aHrefMatch) {
			const href = decodeHtmlEntities(aHrefMatch[1]);
			title = cleanTitle(safeDecodeURIComponent(aHrefMatch[2]));

			if (href.startsWith("http://") || href.startsWith("https://")) {
				isExternal = true;
				externalUrl = href;
			} else {
				filePath = decodeHtmlEntities(safeDecodeURIComponent(href));
				// Convert .html paths to .md (when parsing HTML export's index.html)
				if (filePath.endsWith(".html")) {
					filePath = filePath.replace(/\.html$/, ".md");
				}
				isCsv = filePath.endsWith(".csv");
			}
			currentIndex += aHrefMatch[0].length;
			continue;
		}

		// Check for <a> tag without href (section header or inline db)
		const aSectionMatch = html.slice(currentIndex).match(/^<a>([^<]*)<\/a>/);
		if (aSectionMatch) {
			title = cleanTitle(aSectionMatch[1]);
			isInlineDb = aSectionMatch[1].includes("(Inline database)");
			currentIndex += aSectionMatch[0].length;
			continue;
		}

		// Skip other tags and content
		if (html[currentIndex] === "<") {
			const tagEnd = html.indexOf(">", currentIndex);
			if (tagEnd !== -1) {
				// Check if it's a closing tag for li
				if (html.slice(currentIndex, tagEnd + 1).startsWith("</li>")) {
					currentIndex = tagEnd + 1;
					continue;
				}
				// Check for simple tags
				const simpleTagMatch = html.slice(currentIndex).match(/^<[^>]+>/);
				if (simpleTagMatch) {
					currentIndex += simpleTagMatch[0].length;
					continue;
				}
			}
		}

		currentIndex++;
	}

	// Skip workspace details node
	if (nodeId.includes("Workspace") || title.includes("Workspace")) {
		return { node: null, endIndex: currentIndex };
	}

	// Skip external CSV links that point to notion.so
	if (isExternal && externalUrl?.includes("notion.so")) {
		return { node: null, endIndex: currentIndex };
	}

	// Skip inline databases as separate entries (they're references, not actual pages)
	if (isInlineDb && children.length === 0) {
		return { node: null, endIndex: currentIndex };
	}

	const uuid =
		extractUuid(nodeId) || extractUuid(filePath || "") || extractUuid(title);
	const shortUuid = uuid.slice(0, 8);

	const node: NavNode = {
		id: uuid || nodeId.replace(/[^a-z0-9]/gi, ""),
		title: title || nodeId,
		slug: `${slugify(title || nodeId)}-${shortUuid}`,
		filePath,
		isExternal,
		externalUrl,
		isCsv,
		isInlineDb,
		children,
	};

	return { node, endIndex: currentIndex };
}

export function parseIndexHtml(): WorkspaceData {
	// Use markdown path for navigation (has correct .md file paths)
	// Fall back to HTML path if markdown doesn't have index.html
	const markdownPath = getMarkdownPath();

	let indexPath = path.join(markdownPath, "index.html");
	if (!fs.existsSync(indexPath) && hasHtmlExport()) {
		const htmlPath = getHtmlPath();
		indexPath = path.join(htmlPath, "index.html");
	}

	if (!fs.existsSync(indexPath)) {
		return { id: "", name: "Workspace", tree: [] };
	}

	const html = fs.readFileSync(indexPath, "utf-8");

	// Extract workspace info
	const workspaceIdMatch = html.match(/Workspace identifier:\s*([a-f0-9-]+)/i);
	const workspaceNameMatch = html.match(/Workspace name:\s*([^<]+)/i);

	const workspaceId = workspaceIdMatch ? workspaceIdMatch[1] : "";
	const workspaceName = workspaceNameMatch
		? workspaceNameMatch[1].trim()
		: "Workspace";

	// Parse the tree
	const tree: NavNode[] = [];

	// Find all top-level <ul> elements after the workspace details
	let searchIndex = 0;
	const workspaceDetailsEnd = html.indexOf(
		"</li>",
		html.indexOf("Workspace name:"),
	);
	if (workspaceDetailsEnd !== -1) {
		searchIndex = workspaceDetailsEnd;
	}

	while (searchIndex < html.length) {
		const ulStart = html.indexOf('<ul id="id::', searchIndex);
		if (ulStart === -1) break;

		// Check if this is a nested ul by looking for <li><ul pattern
		const prevContent = html.slice(Math.max(0, ulStart - 10), ulStart);
		if (prevContent.includes("<li>")) {
			const result = parseUlElement(html, ulStart);
			if (result.node) {
				tree.push(result.node);
			}
			searchIndex = result.endIndex;
		} else {
			searchIndex = ulStart + 1;
		}
	}

	return { id: workspaceId, name: workspaceName, tree };
}

export function findNodeById(tree: NavNode[], id: string): NavNode | null {
	for (const node of tree) {
		if (
			node.id === id ||
			node.id.startsWith(id) ||
			id.startsWith(node.id.slice(0, 8))
		) {
			return node;
		}
		const found = findNodeById(node.children, id);
		if (found) return found;
	}
	return null;
}

export function findNodeBySlug(tree: NavNode[], slug: string): NavNode | null {
	for (const node of tree) {
		if (node.slug === slug) {
			return node;
		}
		const found = findNodeBySlug(node.children, slug);
		if (found) return found;
	}
	return null;
}

export function getBreadcrumbs(tree: NavNode[], targetId: string): NavNode[] {
	function search(nodes: NavNode[], path: NavNode[]): NavNode[] | null {
		for (const node of nodes) {
			const newPath = [...path, node];
			if (
				node.id === targetId ||
				node.id.startsWith(targetId) ||
				targetId.startsWith(node.id.slice(0, 8))
			) {
				return newPath;
			}
			const found = search(node.children, newPath);
			if (found) return found;
		}
		return null;
	}

	return search(tree, []) || [];
}

export function flattenTree(tree: NavNode[]): NavNode[] {
	const result: NavNode[] = [];

	function traverse(nodes: NavNode[]) {
		for (const node of nodes) {
			result.push(node);
			traverse(node.children);
		}
	}

	traverse(tree);
	return result;
}
