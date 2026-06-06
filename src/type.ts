export interface RegionConfig {
    cdn: string;
    appId: string;
    platform: string;
}

export interface CdnConfig {
    cdnList: Record<string, RegionConfig>;
    token: Record<string, Record<string, string>>;
    signKey: Record<string, string>;
}