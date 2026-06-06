import rawConfig from "./cdn/cdn.json";
import rawLauncherConfig from "./cdn/launcher.json";

import {
    CdnConfig,
    RegionConfig,
    LauncherConfig,
    LauncherRegionConfig,
} from "./type";
import { compareConfigTabs } from "./cdn_diff";
import { compareLauncherConfigs } from "./launcher_cdn_diff";
import { hasDiff } from "./helper";
import {
    createDiscordContent,
    sendDiscordWebhook,
} from "./discord_message";

const cdnConfig = rawConfig as CdnConfig;
const launcherConfig = rawLauncherConfig as LauncherConfig;

interface Env {
    CONFIG_KV: KVNamespace;
    DISCORD_WEBHOOK_URL: string;
    DISCORD_ROLE_ID: string;
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === "/test-discord") {
            try {
                const content = createDiscordContent(
                    "TEST_REGION",
                    {
                        added: { "test_key": "test_value" },
                        removed: {},
                        changed: [],
                    },
                    env.DISCORD_ROLE_ID,
                );

                await sendDiscordWebhook(
                    env.DISCORD_WEBHOOK_URL,
                    content,
                );

                return new Response("Test message sent!");
            } catch (error: any) {
                return new Response(
                    `Failed to send test message: ${error.message}`,
                    { status: 500 },
                );
            }
        }

        return new Response("PGR CDN Monitor is running.");
    },

    async scheduled(
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<void> {
        console.log(
            `trigger fired at ${controller.cron}`,
        );

        await processCdnConfigs(env);
        await processLauncherConfigs(env);
    },
} satisfies ExportedHandler<Env>;

async function processLauncherConfigs(
    env: Env,
): Promise<void> {
    for (const [region, regionConfig] of Object.entries(
        launcherConfig,
    )) {
        try {
            await processLauncherRegion(
                env,
                region,
                regionConfig,
            );
        } catch (error) {
            console.error(
                `[Launcher:${region}] processing failed`,
                error,
            );
        }
    }
}

async function processLauncherRegion(
    env: Env,
    region: string,
    regionConfig: LauncherRegionConfig,
): Promise<void> {
    const url = buildLauncherUrl(
        regionConfig.cdn,
        regionConfig.game_id,
        regionConfig.iteration,
    );

    console.log(
        `[Launcher:${region}] downloading config`,
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
        `snapshot:launcher:${region}`;

    const previousSnapshot =
        await env.CONFIG_KV.get(
            snapshotKey,
        );

    if (!previousSnapshot) {
        console.log(
            `[Launcher:${region}] creating initial snapshot`,
        );

        await env.CONFIG_KV.put(
            snapshotKey,
            currentSnapshot,
        );

        return;
    }

    const diff = compareLauncherConfigs(
        previousSnapshot,
        currentSnapshot,
    );

    if (!hasDiff(diff)) {
        console.log(
            `[Launcher:${region}] no changes`,
        );

        return;
    }

    const content =
        createDiscordContent(
            `Launcher:${region}`,
            diff,
            env.DISCORD_ROLE_ID,
        );

    console.log(content);

    await sendDiscordWebhook(
        env.DISCORD_WEBHOOK_URL,
        content,
    );

    await env.CONFIG_KV.put(
        snapshotKey,
        currentSnapshot,
    );

    console.log(
        `[Launcher:${region}] snapshot updated`,
    );
}

function buildLauncherUrl(
    cdn: string,
    gameId: number,
    iteration: string,
): string {
    return [
        cdn.replace(/\/$/, ""),
        "game",
        `G${gameId}`,
        iteration,
        "index.json",
    ].join("/");
}

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
            env.DISCORD_ROLE_ID,
        );

    console.log(content);

    await sendDiscordWebhook(
        env.DISCORD_WEBHOOK_URL,
        content,
    );

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
