import { parse as parseYaml } from "yaml";

/**
 * Supported frontmatter fields for Fountain files (YAML between --- at start of file).
 * All fields are optional; arbitrary additional keys are allowed.
 */
export interface FountainFrontmatter {
	/** Entry type: act, sequence, scene, beat, or Save the Cat style (opening_image, midpoint, etc.) */
	type?: "act" | "sequence" | "scene" | "beat" | string;
	/** IDs of beats or beat-sheet nodes this entry fulfills */
	beatIds?: string[];
	/** Short synopsis (machine-readable) */
	summary?: string;
	/** One-line point of the entry (e.g. "Jordan finds out his grandmother is alive") */
	point?: string;
	/** Scene/unit goal */
	goal?: string;
	/** Main conflict in this unit */
	conflict?: string;
	/** Result of the unit */
	outcome?: string;
	/** Location IDs for breakdown/scheduling */
	locationIds?: string[];
	/** Human-readable location name */
	location?: string;
	/** int, ext, int/ext */
	intExt?: string;
	/** day, night, dawn, etc. */
	timeOfDay?: string;
	/** Set/stage name for production */
	set?: string;
	/** Script day (e.g. "Day 1") */
	day?: string;
	/** Estimated duration (e.g. "2 min") or page count */
	duration?: string | number;
	/** Estimated page count */
	pages?: number;
	/** Stable URL-friendly id */
	slug?: string;
	/** Display title */
	title?: string;
	/** Parent slug/id for hierarchy */
	parent?: string;
	[key: string]: unknown;
}

export interface ParseFrontmatterResult {
	frontmatter: FountainFrontmatter | null;
	body: string;
}

const FRONTMATTER_OPEN = "---";

/**
 * Parse YAML frontmatter from the start of a Fountain file.
 * If the file does not start with "---" on the first line, returns { frontmatter: null, body: script }.
 */
export function parseFrontmatter(script: string): ParseFrontmatterResult {
	if (!script || typeof script !== "string") {
		return { frontmatter: null, body: script || "" };
	}
	const firstLineEnd = script.indexOf("\n");
	const firstLine = firstLineEnd === -1 ? script : script.slice(0, firstLineEnd);
	const trimmedFirst = firstLine.trim();
	if (trimmedFirst !== FRONTMATTER_OPEN) {
		return { frontmatter: null, body: script };
	}
	// Find closing --- (must be at start of a line)
	const rest = firstLineEnd === -1 ? "" : script.slice(firstLineEnd + 1);
	const closeMatch = rest.match(/\n---\s*(\n|$)/);
	if (!closeMatch || closeMatch.index == null) {
		return { frontmatter: null, body: script };
	}
	const yamlBlock = rest.slice(0, closeMatch.index).trim();
	const bodyStart = firstLineEnd + 1 + closeMatch.index + closeMatch[0].length;
	const body = script.slice(bodyStart);
	let frontmatter: FountainFrontmatter;
	try {
		const parsed = parseYaml(yamlBlock);
		if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
			frontmatter = normalizeFrontmatter(parsed as Record<string, unknown>);
		} else {
			frontmatter = {};
		}
	} catch {
		return { frontmatter: null, body: script };
	}
	return { frontmatter, body };
}

const SNAKE_TO_CAMEL: Record<string, string> = {
	beat_ids: "beatIds",
	location_ids: "locationIds",
	time_of_day: "timeOfDay",
	int_ext: "intExt",
};

/** Normalize common key variants (snake_case → camelCase) and ensure arrays where expected. */
function normalizeFrontmatter(raw: Record<string, unknown>): FountainFrontmatter {
	const out: FountainFrontmatter = {};
	const arrayKeys = new Set(["beatIds", "locationIds"]);
	for (const [key, value] of Object.entries(raw)) {
		if (value === undefined) continue;
		const k = SNAKE_TO_CAMEL[key] ?? key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
		if (arrayKeys.has(k) && !Array.isArray(value)) {
			(out as Record<string, unknown>)[k] = typeof value === "string" ? [value] : [String(value)];
		} else {
			(out as Record<string, unknown>)[k] = value;
		}
	}
	return out;
}

/**
 * Remove frontmatter block from content and return only the body.
 * Use when concatenating multiple Fountain files (e.g. manifest) so the result is valid Fountain.
 */
export function stripFrontmatter(script: string): string {
	const { body } = parseFrontmatter(script);
	return body;
}
