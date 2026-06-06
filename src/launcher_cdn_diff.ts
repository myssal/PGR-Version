import {
    ParsedDiff,
    diffKeyValueMaps,
} from "./helper";

export function parseLauncherConfig(
    text: string,
): Record<string, string> {
    try {
        const data = JSON.parse(text);
        return flattenObject(data);
    } catch (error) {
        console.error("Failed to parse launcher config JSON", error);
        return {};
    }
}

function flattenObject(
    obj: any,
    prefix = "",
): Record<string, string> {
    const result: Record<string, string> = {};

    if (obj === null || typeof obj !== "object") {
        if (prefix) {
            result[prefix] = String(obj);
        }
        return result;
    }

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
        ) {
            Object.assign(
                result,
                flattenObject(value, fullKey),
            );
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                const arrayKey = `${fullKey}[${index}]`;
                if (typeof item === "object" && item !== null) {
                    Object.assign(
                        result,
                        flattenObject(item, arrayKey),
                    );
                } else {
                    result[arrayKey] = String(item);
                }
            });
        } else {
            result[fullKey] = String(value);
        }
    }

    return result;
}

export function compareLauncherConfigs(
    oldText: string,
    newText: string,
): ParsedDiff {
    const oldConfig = parseLauncherConfig(oldText);
    const newConfig = parseLauncherConfig(newText);

    return diffKeyValueMaps(
        oldConfig,
        newConfig,
    );
}
