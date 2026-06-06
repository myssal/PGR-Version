import rawConfig from "./cdn/cdn.json";

import { CdnConfig, RegionConfig } from "./type";
import { compareConfigTabs } from "./cdn_diff";
import { hasDiff } from "./helper";
import { createDiscordContent } from "./discord_message";

const cdnConfig = rawConfig as CdnConfig;

interface Env {
    CONFIG_KV: KVNamespace;
}

export default {
    async scheduled(
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<void> {
        console.log(
            `trigger fired at ${controller.cron}`,
        );

        await processCdnConfigs(env);
    },
} satisfies ExportedHandler<Env>;

async function processCdnConfigs(
    env: Env,
): Promise<void> {
    const latestVersion = getLatestVersion(
        Object.keys(cdnConfig.token),
    );

    console.log(
        `latest version: ${latestVersion}`,
    );

    const tokenMap: Record<string, string> =
        cdnConfig.token[latestVersion] ?? {};

    for (const [region, regionConfig] of Object.entries(
        cdnConfig.cdnList,
    )) {
        const token =
            tokenMap[region] ??
            tokenMap[region.replace("_PC", "")];

        if (!token) {
            console.log(
                `[${region}] no token found`,
            );

            continue;
        }

        try {
            await processRegion(
                env,
                region,
                regionConfig,
                latestVersion,
                token,
            );
        } catch (error) {
            console.error(
                `[${region}] processing failed`,
                error,
            );
        }
    }
}

async function processRegion(
    env: Env,
    region: string,
    regionConfig: RegionConfig,
    version: string,
    token: string,
): Promise<void> {
    const url = buildConfigUrl(
        regionConfig.cdn,
        token,
        regionConfig.appId,
        version,
        regionConfig.platform,
    );

    console.log(
        `[${region}] downloading config`,
    );

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `download failed (${response.status})`,
        );
    }

    const currentSnapshot =
        await response.text();

    const snapshotKey =
        `snapshot:${region}`;

    const previousSnapshot =
        await env.CONFIG_KV.get(
            snapshotKey,
        );

    if (!previousSnapshot) {
        console.log(
            `[${region}] creating initial snapshot`,
        );

        await env.CONFIG_KV.put(
            snapshotKey,
            currentSnapshot,
        );

        return;
    }

    const diff = compareConfigTabs(
        previousSnapshot,
        currentSnapshot,
    );

    if (!hasDiff(diff)) {
        console.log(
            `[${region}] no changes`,
        );

        return;
    }

    const content =
        createDiscordContent(
            region,
            diff,
        );

    console.log(content);

    // await sendDiscordWebhook(content);

    await env.CONFIG_KV.put(
        snapshotKey,
        currentSnapshot,
    );

    console.log(
        `[${region}] snapshot updated`,
    );
}

function buildConfigUrl(
    cdn: string,
    token: string,
    appId: string,
    version: string,
    platform: string,
): string {
    return [
        cdn.replace(/\/$/, ""),
        "client",
        "config",
        token,
        appId,
        version,
        platform,
        "config.tab",
    ].join("/");
}

function getLatestVersion(
    versions: string[],
): string {
    return versions
        .sort(compareVersions)
        .at(-1)!;
}

function compareVersions(
    a: string,
    b: string,
): number {
    const aParts = a
        .split(".")
        .map(Number);

    const bParts = b
        .split(".")
        .map(Number);

    const maxLength = Math.max(
        aParts.length,
        bParts.length,
    );

    for (let i = 0; i < maxLength; i++) {
        const aValue = aParts[i] ?? 0;
        const bValue = bParts[i] ?? 0;

        if (aValue > bValue) {
            return 1;
        }

        if (aValue < bValue) {
            return -1;
        }
    }

    return 0;
}