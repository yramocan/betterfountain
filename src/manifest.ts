import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { stripFrontmatter } from "./frontmatter";

export const MANIFEST_FILENAME = "screenplay.json";

export type ManifestPathEntry = { path: string };
export type ManifestGroupEntry = { label: string; entries: ManifestEntry[] };
export type ManifestEntry = ManifestPathEntry | ManifestGroupEntry;

export function isPathEntry(e: ManifestEntry): e is ManifestPathEntry {
	return "path" in e && typeof (e as ManifestPathEntry).path === "string";
}

export function isGroupEntry(e: ManifestEntry): e is ManifestGroupEntry {
	return "label" in e && Array.isArray((e as ManifestGroupEntry).entries);
}

export interface Manifest {
	version?: number;
	entries: ManifestEntry[];
}

/** Flatten manifest entries to an ordered list of paths (relative to manifest dir). */
export function flattenManifestToPaths(entries: ManifestEntry[]): string[] {
	const out: string[] = [];
	for (const e of entries) {
		if (isPathEntry(e)) out.push(e.path);
		else if (isGroupEntry(e)) out.push(...flattenManifestToPaths(e.entries));
	}
	return out;
}

/** Find screenplay.json in the same directory as uri, then in workspace root. */
export function findManifestFor(uri: vscode.Uri): vscode.Uri | null {
	const dir = path.dirname(uri.fsPath);
	const sameDir = path.join(dir, MANIFEST_FILENAME);
	if (fs.existsSync(sameDir)) return vscode.Uri.file(sameDir);
	const folder = vscode.workspace.getWorkspaceFolder(uri);
	if (folder) {
		const atRoot = path.join(folder.uri.fsPath, MANIFEST_FILENAME);
		if (fs.existsSync(atRoot)) return vscode.Uri.file(atRoot);
	}
	return null;
}

/** Load and parse manifest file. */
export function loadManifest(manifestUri: vscode.Uri): Manifest | null {
	try {
		const raw = fs.readFileSync(manifestUri.fsPath, "utf8");
		const data = JSON.parse(raw) as unknown;
		if (!data || typeof data !== "object" || !Array.isArray((data as Manifest).entries)) return null;
		return data as Manifest;
	} catch {
		return null;
	}
}

/** Resolve relative paths to absolute file URIs (relative to manifest directory). */
export function resolvePaths(manifestUri: vscode.Uri, relativePaths: string[]): vscode.Uri[] {
	const manifestDir = path.dirname(manifestUri.fsPath);
	return relativePaths.map((p) => vscode.Uri.file(path.resolve(manifestDir, p)));
}

/** Read combined content of all manifest files. Returns null if any file is missing or unreadable. */
export function loadCombinedContent(manifestUri: vscode.Uri): { content: string; paths: vscode.Uri[] } | null {
	const manifest = loadManifest(manifestUri);
	if (!manifest) return null;
	const relativePaths = flattenManifestToPaths(manifest.entries);
	if (relativePaths.length === 0) return null;
	const uris = resolvePaths(manifestUri, relativePaths);
	const parts: string[] = [];
	for (const uri of uris) {
		try {
			if (!fs.existsSync(uri.fsPath)) return null;
			const raw = fs.readFileSync(uri.fsPath, "utf8");
			parts.push(stripFrontmatter(raw));
		} catch {
			return null;
		}
	}
	return { content: parts.join("\n\n"), paths: uris };
}
