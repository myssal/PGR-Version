import { ParsedDiff } from "./helper";

const DISCORD_CONTENT_LIMIT = 2000;

function truncateDiscordContent(content: string): string {
    if (content.length <= DISCORD_CONTENT_LIMIT) {
        return content;
    }

    const suffix = "\n...\n```";

    if (content.endsWith("```")) {
        return (
            content.slice(0, DISCORD_CONTENT_LIMIT - suffix.length - 3) +
            "..." +
            "\n```"
        );
    }

    return content.slice(0, DISCORD_CONTENT_LIMIT - 3) + "...";
}

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
    roleId?: string,
): string {
    const parts = [];

    if (roleId) {
        parts.push(`<@&${roleId}>`);
    }

    parts.push("```diff");
    parts.push(formatConfigDiff(region, diff));
    parts.push("```");

    return parts.join("\n");
}

export async function sendDiscordWebhook(
    webhookUrl: string,
    content: string,
): Promise<void> {
    const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            content: truncateDiscordContent(content),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `Failed to send Discord webhook: ${response.status} ${errorText}`,
        );
    }
}