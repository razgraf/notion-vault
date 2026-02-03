import fs from "fs";
import path from "path";

export interface WorkspaceConfig {
	markdown: string;
	html?: string;
}

export interface NotionPreviewConfig {
	workspace: WorkspaceConfig;
	theme: "dark" | "light";
	defaultCsvVariant: "all" | "filtered";
	features: {
		search: boolean;
		breadcrumbs: boolean;
		imageGallery: boolean;
		headingAnchors: boolean;
		icons: boolean;
	};
}

const defaultConfig: NotionPreviewConfig = {
	workspace: {
		markdown: "./workspace/markdown",
	},
	theme: "dark",
	defaultCsvVariant: "all",
	features: {
		search: true,
		breadcrumbs: true,
		imageGallery: true,
		headingAnchors: true,
		icons: true,
	},
};

let cachedConfig: NotionPreviewConfig | null = null;

export function getConfig(): NotionPreviewConfig {
	if (cachedConfig) return cachedConfig;

	// For server-side, try to read the config file directly
	const configPath = path.join(process.cwd(), "notion-preview.config.js");

	if (fs.existsSync(configPath)) {
		try {
			const configContent = fs.readFileSync(configPath, "utf-8");
			// Parse the config as a simple object (supports module.exports = {...})
			const match = configContent.match(/module\.exports\s*=\s*(\{[\s\S]*\})/);
			if (match) {
				// Use Function constructor to safely evaluate the config object
				const evalConfig = new Function(`return ${match[1]}`)();
				cachedConfig = {
					...defaultConfig,
					...evalConfig,
					workspace: { ...defaultConfig.workspace, ...evalConfig.workspace },
					features: { ...defaultConfig.features, ...evalConfig.features },
				};
				return cachedConfig!;
			}
		} catch (e) {
			console.warn("Failed to load config:", e);
		}
	}

	cachedConfig = defaultConfig;
	return cachedConfig;
}

export function getMarkdownPath(): string {
	const config = getConfig();
	return path.isAbsolute(config.workspace.markdown)
		? config.workspace.markdown
		: path.join(process.cwd(), config.workspace.markdown);
}

export function getHtmlPath(): string {
	const config = getConfig();
	if (!config.workspace.html) {
		return "";
	}
	return path.isAbsolute(config.workspace.html)
		? config.workspace.html
		: path.join(process.cwd(), config.workspace.html);
}

export function hasHtmlExport(): boolean {
	const htmlPath = getHtmlPath();
	return htmlPath !== "" && fs.existsSync(htmlPath);
}
