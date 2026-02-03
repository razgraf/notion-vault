"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavNode } from "@/lib/parser/index-html";

interface NavTreeProps {
	nodes: NavNode[];
	level?: number;
	currentSlug?: string;
	expandedNodes: Set<string>;
	onToggle: (id: string) => void;
}

function NodeIcon({ icon, size = "sm" }: { icon: string; size?: "sm" | "lg" }) {
	const isImagePath = icon.includes("/") || icon.includes(".");
	const sizeClass = size === "lg" ? "w-10 h-10 text-4xl" : "w-4 h-4 text-sm";

	if (isImagePath) {
		return (
			<img
				src={`/api/image?path=${encodeURIComponent(icon)}`}
				alt=""
				className={`${sizeClass} object-contain flex-shrink-0`}
			/>
		);
	}

	return (
		<span className={`${sizeClass} flex-shrink-0 leading-none`}>{icon}</span>
	);
}

function NavItem({
	node,
	level,
	currentSlug,
	expandedNodes,
	onToggle,
}: {
	node: NavNode;
	level: number;
	currentSlug?: string;
	expandedNodes: Set<string>;
	onToggle: (id: string) => void;
}) {
	const itemRef = useRef<HTMLDivElement>(null);
	const hasChildren = node.children.length > 0;
	const isExpanded = expandedNodes.has(node.id);
	const isActive = node.slug === currentSlug;
	// Clickable if has file OR has children (we can show children table)
	const isClickable = !node.isExternal && (node.filePath || hasChildren);

	const paddingLeft = `${level * 12 + 8}px`;

	const handleNavClick = () => {
		// Toggle expansion when navigating to a page with children
		if (hasChildren && !isExpanded) {
			onToggle(node.id);
		}
	};

	// Scroll active item into view
	useEffect(() => {
		if (isActive && itemRef.current) {
			itemRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
		}
	}, [isActive]);

	return (
		<div>
			<div
				ref={itemRef}
				className={`
          flex items-center gap-1 py-1 px-2 rounded-[4px] cursor-pointer transition-colors
          ${isActive ? "bg-accent/10 border-l-2 border-accent" : "hover:bg-hover"}
        `}
				style={{ paddingLeft }}
			>
				{hasChildren && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							onToggle(node.id);
						}}
						className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-text-secondary hover:text-text-primary"
						aria-label={isExpanded ? "Collapse" : "Expand"}
					>
						<svg
							className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
				)}
				{!hasChildren && <span className="w-5" />}

				{node.isExternal ? (
					<a
						href={node.externalUrl}
						target="_blank"
						rel="noopener noreferrer"
						title={node.title}
						className="flex-1 truncate text-sm text-text-secondary hover:text-text-primary external-link flex items-center gap-1.5"
					>
						{node.icon && <NodeIcon icon={node.icon} size="sm" />}
						<span className="truncate">{node.title}</span>
					</a>
				) : isClickable ? (
					<Link
						href={`/page/${node.slug}`}
						onClick={handleNavClick}
						title={node.title}
						className={`flex-1 truncate text-sm flex items-center gap-1.5 ${
							isActive
								? "text-text-primary font-medium"
								: "text-text-secondary hover:text-text-primary"
						}`}
					>
						{node.icon && <NodeIcon icon={node.icon} size="sm" />}
						<span className="truncate">{node.title}</span>
					</Link>
				) : (
					<span
						title={node.title}
						className="flex-1 truncate text-sm text-text-secondary flex items-center gap-1.5"
					>
						{node.icon && <NodeIcon icon={node.icon} size="sm" />}
						<span className="truncate">{node.title}</span>
					</span>
				)}

				{node.isCsv && (
					<span className="text-xs text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">
						CSV
					</span>
				)}
			</div>

			{hasChildren && isExpanded && (
				<NavTree
					nodes={node.children}
					level={level + 1}
					currentSlug={currentSlug}
					expandedNodes={expandedNodes}
					onToggle={onToggle}
				/>
			)}
		</div>
	);
}

export function NavTree({
	nodes,
	level = 0,
	currentSlug,
	expandedNodes,
	onToggle,
}: NavTreeProps) {
	return (
		<div>
			{nodes.map((node) => (
				<NavItem
					key={node.id}
					node={node}
					level={level}
					currentSlug={currentSlug}
					expandedNodes={expandedNodes}
					onToggle={onToggle}
				/>
			))}
		</div>
	);
}

export function useExpandedNodes(tree: NavNode[], currentSlug?: string) {
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
		// Start collapsed - will auto-expand to current page
		return new Set<string>();
	});

	// Auto-expand path to current page
	useEffect(() => {
		if (!currentSlug) return;

		function findPath(nodes: NavNode[], path: string[] = []): string[] | null {
			for (const node of nodes) {
				const newPath = [...path, node.id];
				if (node.slug === currentSlug) {
					return newPath;
				}
				const found = findPath(node.children, newPath);
				if (found) return found;
			}
			return null;
		}

		const path = findPath(tree);
		if (path) {
			setExpandedNodes((prev) => {
				const next = new Set(prev);
				path.forEach((id) => next.add(id));
				return next;
			});
		}
	}, [currentSlug, tree]);

	const toggle = (id: string) => {
		setExpandedNodes((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const expandAll = () => {
		function collectIds(nodes: NavNode[]): string[] {
			return nodes.flatMap((node) => [node.id, ...collectIds(node.children)]);
		}
		setExpandedNodes(new Set(collectIds(tree)));
	};

	const collapseAll = () => {
		setExpandedNodes(new Set());
	};

	return { expandedNodes, toggle, expandAll, collapseAll };
}
