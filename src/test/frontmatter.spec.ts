import { parseFrontmatter, stripFrontmatter, FountainFrontmatter } from "../frontmatter";

describe("Frontmatter", () => {
	it("returns body only when file does not start with ---", () => {
		const script = "Title: Hello\n\nINT. ROOM - DAY\n\nAction.";
		const { frontmatter, body } = parseFrontmatter(script);
		expect(frontmatter).toBeNull();
		expect(body).toBe(script);
	});

	it("parses YAML frontmatter and returns body", () => {
		const script = `---
type: scene
summary: Jordan gets the key
point: Jordan receives the key and the note
locationIds:
  - station
beatIds:
  - catalyst
---

Title: My Script

INT. COFFEE SHOP - DAY

Action here.
`;
		const { frontmatter, body } = parseFrontmatter(script);
		expect(frontmatter).not.toBeNull();
		expect((frontmatter as FountainFrontmatter).type).toBe("scene");
		expect((frontmatter as FountainFrontmatter).summary).toBe("Jordan gets the key");
		expect((frontmatter as FountainFrontmatter).point).toBe("Jordan receives the key and the note");
		expect((frontmatter as FountainFrontmatter).locationIds).toEqual(["station"]);
		expect((frontmatter as FountainFrontmatter).beatIds).toEqual(["catalyst"]);
		expect(body).toContain("Title: My Script");
		expect(body).toContain("INT. COFFEE SHOP - DAY");
		expect(body).not.toContain("type: scene");
	});

	it("normalizes snake_case to camelCase", () => {
		const script = `---
beat_ids: [catalyst]
location_ids: [station]
time_of_day: day
int_ext: int
---

Body
`;
		const { frontmatter, body } = parseFrontmatter(script);
		expect(frontmatter).not.toBeNull();
		expect((frontmatter as FountainFrontmatter).beatIds).toEqual(["catalyst"]);
		expect((frontmatter as FountainFrontmatter).locationIds).toEqual(["station"]);
		expect((frontmatter as FountainFrontmatter).timeOfDay).toBe("day");
		expect((frontmatter as FountainFrontmatter).intExt).toBe("int");
		expect(body).toContain("Body");
	});

	it("stripFrontmatter removes block and returns body only", () => {
		const withFm = `---
type: act
---

INT. ROOM - DAY
`;
		const stripped = stripFrontmatter(withFm);
		expect(stripped).not.toContain("type: act");
		expect(stripped).toContain("INT. ROOM - DAY");
		expect(stripped.trim()).toBe("INT. ROOM - DAY");
		expect(stripFrontmatter("No frontmatter")).toBe("No frontmatter");
	});

	it("returns full script when YAML is invalid", () => {
		const script = `---
invalid: [unclosed
---

Body
`;
		const { frontmatter, body } = parseFrontmatter(script);
		expect(frontmatter).toBeNull();
		expect(body).toBe(script);
	});
});
