import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export interface FirstAppearance {
	sceneTitle: string;
	line: number;
}

export interface CharacterEntry {
	description: string;
	role: string;
	notes: string;
	firstAppearance: FirstAppearance | null;
	variants: string[];
}

export interface CharacterSidecar {
	version: number;
	characters: Record<string, CharacterEntry>;
}

const SIDECAR_SUFFIX = ".characters.json";

/** Path to the sidecar file for a Fountain document (e.g. screenplay.fountain -> screenplay.fountain.characters.json). */
export function getSidecarPath(docUri: vscode.Uri): vscode.Uri {
	const dir = path.dirname(docUri.fsPath);
	const base = path.basename(docUri.fsPath);
	return vscode.Uri.file(path.join(dir, base + SIDECAR_SUFFIX));
}

/** Normalize script name to a canonical key (title case: first letter upper, rest lower). */
export function toCanonicalName(scriptName: string): string {
	if (!scriptName || scriptName.length === 0) return scriptName;
	return scriptName.charAt(0).toUpperCase() + scriptName.slice(1).toLowerCase();
}

export function loadSidecar(sidecarUri: vscode.Uri): CharacterSidecar | null {
	try {
		const raw = fs.readFileSync(sidecarUri.fsPath, "utf8");
		const data = JSON.parse(raw) as CharacterSidecar;
		if (data.version !== 1 || !data.characters || typeof data.characters !== "object") return null;
		return data;
	} catch {
		return null;
	}
}

export function saveSidecar(sidecarUri: vscode.Uri, data: CharacterSidecar): void {
	fs.writeFileSync(sidecarUri.fsPath, JSON.stringify(data, null, 2), "utf8");
}

/** Merge script character names and optional first-appearance data into sidecar. Preserves user fields (description, role, notes). */
export function mergeWithScript(
	sidecar: CharacterSidecar | null,
	scriptCharacterNames: string[],
	firstAppearanceByScriptName?: Record<string, FirstAppearance>
): CharacterSidecar {
	const characters: Record<string, CharacterEntry> = sidecar?.characters ? { ...sidecar.characters } : {};
	const seen = new Set<string>();

	for (const scriptName of scriptCharacterNames) {
		const canonical = toCanonicalName(scriptName);
		const firstApp = firstAppearanceByScriptName?.[scriptName] ?? firstAppearanceByScriptName?.[canonical] ?? null;
		if (characters[canonical]) {
			const entry = characters[canonical];
			if (!entry.variants.includes(scriptName)) entry.variants.push(scriptName);
			if (firstApp != null && entry.firstAppearance == null) entry.firstAppearance = firstApp;
			// Optionally update firstAppearance if script-derived (auto-update)
			if (firstApp != null) entry.firstAppearance = firstApp;
		} else {
			characters[canonical] = {
				description: "",
				role: "",
				notes: "",
				firstAppearance: firstApp,
				variants: [scriptName],
			};
		}
		seen.add(canonical);
	}

	// Prune characters no longer in script (optional: keep them for reference). Plan says "first appearance auto-updated"; we keep all known characters in sidecar.
	return { version: 1, characters };
}

/** Build first-appearance map from character stats report (first entry per character). */
export function firstAppearanceFromReport(
	characterStats: Array<{ name: string; report?: Array<{ sceneTitle: string; line: number }> }>
): Record<string, FirstAppearance> {
	const map: Record<string, FirstAppearance> = {};
	for (const char of characterStats) {
		if (char.report && char.report.length > 0) {
			const first = char.report[0];
			map[char.name] = { sceneTitle: first.sceneTitle, line: first.line };
			const canonical = toCanonicalName(char.name);
			if (canonical !== char.name) map[canonical] = map[char.name];
		}
	}
	return map;
}
