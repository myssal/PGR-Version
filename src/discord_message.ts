import { ParsedDiff } from "./helper";

export function formatConfigDiff(
    region: string,
    diff: ParsedDiff,
): string {
    const lines: string[] = [];

    lines.push(`Update Detected: ${region}`);
    lines.push("");

    const addedEntries = Object.entries(diff.added);

    if (addedEntries.length > 0) {
        lines.push(`Added (${addedEntries.length})`);

        for (const [key, value] of addedEntries) {
            lines.push(`+ ${key} = ${value}`);
        }

        lines.push("");
    }

    const removedEntries = Object.entries(diff.removed);

    if (removedEntries.length > 0) {
        lines.push(`Removed (${removedEntries.length})`);

        for (const [key, value] of removedEntries) {
            lines.push(`- ${key} = ${value}`);
        }

        lines.push("");
    }

    if (diff.changed.length > 0) {
        lines.push(`Changed (${diff.changed.length})`);

        for (const change of diff.changed) {
            lines.push(`~ ${change.key}`);
            lines.push(`  ${change.oldValue}`);
            lines.push(`  -> ${change.newValue}`);
            lines.push("");
        }
    }

    return lines.join("\n");
}

export function createDiscordContent(
    region: string,
    diff: ParsedDiff,
): string {
    return [
        "```diff",
        formatConfigDiff(region, diff),
        "```",
    ].join("\n");
}