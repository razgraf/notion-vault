"use client";

import Link from "next/link";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NavNode } from "@/lib/parser/index-html";
import { ImageGallery } from "../ImageGallery";

interface PageContentProps {
	content: string;
	filePath: string;
	navTree: NavNode[];
	icon?: string;
}

interface PropertyItem {
	key: string;
	value: string;
}

// Convert Notion's relation format "Name (path.md)" to markdown "[Name](path.md)"
function convertNotionLinksToMarkdown(text: string): string {
	// Match patterns like "Name (../path/file.md)" or "Name (path.md)"
	// But avoid matching things like "e.g. (example)" or URLs
	return text.replace(
		/([^,([]+?)\s*\((\.\.[^)]+\.md|[^)]+\.md)\)/g,
		(match, name, path) => {
			const trimmedName = name.trim();
			// Skip if name looks like it's part of a sentence or is empty
			if (!trimmedName || trimmedName.endsWith(".")) return match;
			return `[${trimmedName}](${path})`;
		},
	);
}

function parseDbItemContent(
	content: string,
): { title: string; properties: PropertyItem[]; body: string } | null {
	const lines = content.split("\n");

	// Must start with H1
	if (!lines[0]?.startsWith("# ")) return null;

	const title = lines[0].slice(2).trim();
	const properties: PropertyItem[] = [];
	let bodyStartIndex = 1;

	// Skip empty line after title
	if (lines[1]?.trim() === "") bodyStartIndex = 2;

	// Parse property lines (Key: Value format)
	for (let i = bodyStartIndex; i < lines.length; i++) {
		const line = lines[i];
		// Property line: starts with word characters followed by colon
		const propMatch = line.match(/^([A-Za-z][A-Za-z0-9\s]*?):\s*(.+)$/);
		if (propMatch) {
			const value = convertNotionLinksToMarkdown(propMatch[2].trim());
			properties.push({ key: propMatch[1].trim(), value });
			bodyStartIndex = i + 1;
		} else if (line.trim() === "") {
			// Empty line - could be separator between props and body
			bodyStartIndex = i + 1;
		} else {
			// Not a property line, rest is body
			break;
		}
	}

	// Only treat as DB item if we found at least 2 properties
	if (properties.length < 2) return null;

	const body = lines.slice(bodyStartIndex).join("\n").trim();
	return { title, properties, body };
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

function findNodeByPath(tree: NavNode[], targetPath: string): NavNode | null {
	// Normalize paths for comparison
	const normalize = (p: string) =>
		decodeURIComponent(p)
			.replace(/%20/g, " ")
			.replace(/\\/g, "/")
			.toLowerCase();

	const normalizedTarget = normalize(targetPath);

	function search(nodes: NavNode[]): NavNode | null {
		for (const node of nodes) {
			if (node.filePath) {
				const normalizedNodePath = normalize(node.filePath);
				if (
					normalizedNodePath === normalizedTarget ||
					normalizedNodePath.endsWith(normalizedTarget)
				) {
					return node;
				}
			}
			const found = search(node.children);
			if (found) return found;
		}
		return null;
	}

	return search(tree);
}

function PageIcon({ icon }: { icon: string }) {
	const isImagePath = icon.includes("/") || icon.includes(".");

	if (isImagePath) {
		return (
			<img
				src={`/api/image?path=${encodeURIComponent(icon)}`}
				alt=""
				className="w-16 h-16 object-contain mb-4"
			/>
		);
	}

	return <span className="text-6xl mb-4 block">{icon}</span>;
}

export function PageContent({
	content,
	filePath,
	navTree,
	icon,
}: PageContentProps) {
	const basePath = filePath.split("/").slice(0, -1).join("/");
	const [highlighter, setHighlighter] = useState<unknown>(null);

	// Load Shiki highlighter
	useEffect(() => {
		import("shiki").then(({ createHighlighter }) => {
			createHighlighter({
				themes: ["github-dark"],
				langs: [
					"javascript",
					"typescript",
					"jsx",
					"tsx",
					"json",
					"html",
					"css",
					"python",
					"bash",
					"markdown",
				],
			}).then(setHighlighter);
		});
	}, []);

	// Process content to detect consecutive images for gallery
	// and filter out child page links (already shown in sidebar)
	const processedContent = useMemo(() => {
		const lines = content.split("\n");
		const result: string[] = [];
		let imageBuffer: string[] = [];

		const flushImages = () => {
			if (imageBuffer.length > 3) {
				// Insert gallery marker
				result.push(`<!--gallery:${imageBuffer.join("|")}-->`);
			} else {
				result.push(...imageBuffer.map((img) => `![](${img})`));
			}
			imageBuffer = [];
		};

		// Check if a line is just a child page link (already in sidebar)
		const isChildPageLink = (line: string) => {
			const match = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
			if (!match) return false;
			const href = match[2];
			// Filter out links to .md and .csv files (child pages/databases)
			return (
				href.endsWith(".md") ||
				href.endsWith(".csv") ||
				href.includes(".md)") ||
				href.includes(".csv)")
			);
		};

		for (const line of lines) {
			const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
			if (imgMatch) {
				imageBuffer.push(imgMatch[2]);
			} else if (isChildPageLink(line)) {
			} else {
				if (imageBuffer.length > 0) {
					flushImages();
				}
				result.push(line);
			}
		}

		if (imageBuffer.length > 0) {
			flushImages();
		}

		return result.join("\n");
	}, [content]);

	// Custom components for react-markdown
	const components: Partial<
		ComponentProps<typeof ReactMarkdown>["components"]
	> = useMemo(
		() => ({
			// Headings with anchors
			h1: ({ children, ...props }) => {
				const text = String(children);
				const id = slugify(text);
				return (
					<h1 id={id} {...props}>
						{children}
						<a
							href={`#${id}`}
							className="heading-anchor"
							aria-label="Link to this heading"
						>
							#
						</a>
					</h1>
				);
			},
			h2: ({ children, ...props }) => {
				const text = String(children);
				const id = slugify(text);
				return (
					<h2 id={id} {...props}>
						{children}
						<a
							href={`#${id}`}
							className="heading-anchor"
							aria-label="Link to this heading"
						>
							#
						</a>
					</h2>
				);
			},
			h3: ({ children, ...props }) => {
				const text = String(children);
				const id = slugify(text);
				return (
					<h3 id={id} {...props}>
						{children}
						<a
							href={`#${id}`}
							className="heading-anchor"
							aria-label="Link to this heading"
						>
							#
						</a>
					</h3>
				);
			},
			h4: ({ children, ...props }) => {
				const text = String(children);
				const id = slugify(text);
				return (
					<h4 id={id} {...props}>
						{children}
						<a
							href={`#${id}`}
							className="heading-anchor"
							aria-label="Link to this heading"
						>
							#
						</a>
					</h4>
				);
			},

			// Links - internal vs external
			a: ({ href, children, ...props }) => {
				if (!href) {
					return <span className="broken-link">{children}</span>;
				}

				// External links
				if (href.startsWith("http://") || href.startsWith("https://")) {
					return (
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="external-link"
							{...props}
						>
							{children}
						</a>
					);
				}

				// Internal links - try to resolve to a page
				const decodedHref = decodeURIComponent(href);
				const relativePath = decodedHref.startsWith("./")
					? `${basePath}/${decodedHref.slice(2)}`
					: decodedHref.startsWith("../")
						? resolvePath(basePath, decodedHref)
						: `${basePath}/${decodedHref}`;

				const node = findNodeByPath(navTree, relativePath);

				if (node) {
					return (
						<Link
							href={`/page/${node.slug}`}
							onClick={(e) => {
								// Allow Cmd+Click to open in new tab
								if (e.metaKey || e.ctrlKey) {
									e.preventDefault();
									window.open(`/page/${node.slug}`, "_blank");
								}
							}}
							{...props}
						>
							{children}
						</Link>
					);
				}

				// Broken link
				return (
					<span className="broken-link" title={`Link not found: ${href}`}>
						{children}
					</span>
				);
			},

			// Images
			img: ({ src, alt, ...props }) => {
				if (!src || typeof src !== "string") return null;

				// Check for gallery marker
				if (src.startsWith("<!--gallery:")) {
					return null;
				}

				const imageSrc = src.startsWith("http")
					? src
					: `/api/image?path=${encodeURIComponent(
							src.startsWith("/") ? src.slice(1) : `${basePath}/${src}`,
						)}`;

				return <img src={imageSrc} alt={alt || ""} loading="lazy" {...props} />;
			},

			// Code blocks with Shiki
			code: ({ className, children, ...props }) => {
				const match = /language-(\w+)/.exec(className || "");
				const lang = match ? match[1] : "text";
				const code = String(children).replace(/\n$/, "");

				if (!className) {
					// Inline code
					return <code {...props}>{children}</code>;
				}

				if (highlighter) {
					try {
						const html = (
							highlighter as {
								codeToHtml: (
									code: string,
									opts: { lang: string; theme: string },
								) => string;
							}
						).codeToHtml(code, {
							lang,
							theme: "github-dark",
						});
						return <div dangerouslySetInnerHTML={{ __html: html }} />;
					} catch {
						// Fallback for unsupported languages
					}
				}

				return (
					<pre className={className}>
						<code {...props}>{children}</code>
					</pre>
				);
			},

			// Blockquotes - detect callouts
			blockquote: ({ children, ...props }) => {
				// Check if it's a callout (starts with emoji)
				const text = String(children);
				const emojiMatch = text.match(/^([^\s]+)\s/);
				const isEmoji = emojiMatch && /\p{Emoji}/u.test(emojiMatch[1]);

				if (isEmoji) {
					return (
						<div className="callout">
							<span className="callout-icon">{emojiMatch[1]}</span>
							<div className="callout-content">
								{text.slice(emojiMatch[0].length)}
							</div>
						</div>
					);
				}

				return <blockquote {...props}>{children}</blockquote>;
			},

			// Handle HTML comments (gallery markers)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			p: ({ children, node, ...props }: any) => {
				const text = String(children);

				// Check for gallery marker
				const galleryMatch = text.match(/<!--gallery:(.+)-->/);
				if (galleryMatch) {
					const images = galleryMatch[1].split("|");
					return <ImageGallery images={images} basePath={basePath} />;
				}

				return <p {...props}>{children}</p>;
			},
		}),
		[basePath, navTree, highlighter],
	);

	// Check if this is a database item page
	const dbItem = useMemo(() => parseDbItemContent(content), [content]);

	if (dbItem) {
		return (
			<article className="prose">
				{icon && <PageIcon icon={icon} />}
				<h1>{dbItem.title}</h1>
				<div className="my-4 rounded-lg border border-border overflow-hidden">
					<table className="w-full">
						<tbody>
							{dbItem.properties.map((prop, idx) => (
								<tr
									key={idx}
									className="border-b border-border last:border-b-0"
								>
									<td className="px-4 py-2 bg-bg-secondary text-text-secondary font-medium w-1/4 align-top">
										{prop.key}
									</td>
									<td className="px-4 py-2 [&_p]:m-0">
										<ReactMarkdown
											remarkPlugins={[remarkGfm]}
											components={components}
										>
											{prop.value}
										</ReactMarkdown>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{dbItem.body && (
					<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
						{dbItem.body}
					</ReactMarkdown>
				)}
			</article>
		);
	}

	return (
		<article className="prose">
			{icon && <PageIcon icon={icon} />}
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
				{processedContent}
			</ReactMarkdown>
		</article>
	);
}

function resolvePath(base: string, relative: string): string {
	const baseParts = base.split("/");
	const relativeParts = relative.split("/");

	for (const part of relativeParts) {
		if (part === "..") {
			baseParts.pop();
		} else if (part !== ".") {
			baseParts.push(part);
		}
	}

	return baseParts.join("/");
}
