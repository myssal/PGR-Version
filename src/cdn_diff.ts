import {
    ParsedDiff,
    diffKeyValueMaps,
} from "./helper";

export function parseConfigTab(
    text: string,
): Record<string, string> {
    const result: Record<string, string> = {};

    const lines = text
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0);

    if (lines.length <= 1) {
        return result;
    }

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split("\t");

        if (parts.length < 3) {
            continue;
        }

        const key = parts[0];
        const value = parts.slice(2).join("\t");

        result[key] = value;
    }

    return result;
}

export function compareConfigTabs(
    oldText: string,
    newText: string,
): ParsedDiff {
    const oldConfig = parseConfigTab(oldText);
    const newConfig = parseConfigTab(newText);

    return diffKeyValueMaps(
        oldConfig,
        newConfig,
    );
}