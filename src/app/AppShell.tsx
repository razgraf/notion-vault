"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchModal } from "@/components/SearchModal";
import { Sidebar } from "@/components/Sidebar";
import type { NavNode } from "@/lib/parser/index-html";

interface WorkspaceData {
	id: string;
	name: string;
	tree: NavNode[];
}

export function AppShell({ children }: { children: React.ReactNode }) {
	const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch navigation data
	useEffect(() => {
		fetch("/api/nav")
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load navigation");
				return res.json();
			})
			.then(setWorkspace)
			.catch((err) => setError(err.message));
	}, []);

	// Global keyboard shortcut for search
	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if ((e.metaKey || e.ctrlKey) && e.key === "k") {
			e.preventDefault();
			setIsSearchOpen((open) => !open);
		}
	}, []);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-xl font-semibold text-text-primary mb-2">
						Error
					</h1>
					<p className="text-text-secondary">{error}</p>
				</div>
			</div>
		);
	}

	if (!workspace) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-text-secondary">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<Sidebar
				workspaceName={workspace.name}
				tree={workspace.tree}
				onOpenSearch={() => setIsSearchOpen(true)}
			/>

			<main className="ml-[260px] min-h-screen p-8">
				<div className="max-w-[900px] mx-auto">{children}</div>
			</main>

			<SearchModal
				isOpen={isSearchOpen}
				onClose={() => setIsSearchOpen(false)}
			/>
		</div>
	);
}
