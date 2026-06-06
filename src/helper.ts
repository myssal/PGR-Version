export interface DiffEntry {
    key: string;
    oldValue: string;
    newValue: string;
}

export interface ParsedDiff {
    added: Record<string, string>;
    removed: Record<string, string>;
    changed: DiffEntry[];
}

export function hasDiff(diff: ParsedDiff): boolean {
    return (
        Object.keys(diff.added).length > 0 ||
        Object.keys(diff.removed).length > 0 ||
        diff.changed.length > 0
    );
}

export function diffKeyValueMaps(
    oldData: Record<string, string>,
    newData: Record<string, string>,
): ParsedDiff {
    const added: Record<string, string> = {};
    const removed: Record<string, string> = {};
    const changed: DiffEntry[] = [];

    for (const [key, value] of Object.entries(newData)) {
        if (!(key in oldData)) {
            added[key] = value;
            continue;
        }

        if (oldData[key] !== value) {
            changed.push({
                key,
                oldValue: oldData[key],
                newValue: value,
            });
        }
    }

    for (const [key, value] of Object.entries(oldData)) {
        if (!(key in newData)) {
            removed[key] = value;
        }
    }

    return {
        added,
        removed,
        changed,
    };
}