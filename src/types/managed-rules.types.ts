/**
 * Managed Rules Types
 *
 * Types for managed file handlers (robots.txt, sitemap, .well-known)
 * and remote configuration.
 */

import type { GeoRuleConfig, GeoPageRule } from "./geo.types";

/**
 * File serving mode for managed rules
 */
export type ManagedFileMode = "append" | "merge" | "replace" | "disabled";

/**
 * robots.txt rule configuration
 */
export interface RobotsTxtRuleConfig {
  enabled: boolean;
  mode: ManagedFileMode;
}

/**
 * Sitemap rule configuration
 */
export interface SitemapRuleConfig {
  enabled: boolean;
  mode: ManagedFileMode;
}

/**
 * Per-file configuration for .well-known files
 */
export interface WellKnownFileConfig {
  mode: Extract<ManagedFileMode, "replace" | "disabled">;
}

/**
 * .well-known rule configuration
 * Only explicitly listed files are managed. All other .well-known/* passes to origin.
 */
export interface WellKnownRuleConfig {
  enabled: boolean;
  /** Map of filename to config (e.g. "ai-plugin.json": { mode: "replace" }) */
  files: Record<string, WellKnownFileConfig>;
}

/**
 * Top-level managed rules configuration (SDK code defaults)
 */
export interface ManagedRulesConfig {
  robotsTxt?: RobotsTxtRuleConfig;
  sitemap?: SitemapRuleConfig;
  wellKnown?: WellKnownRuleConfig;
  geo?: GeoRuleConfig;
}

/**
 * Remote config bundle returned by the BotMon API
 * Dashboard-managed, takes priority over SDK code config.
 */
export interface RemoteConfigBundle {
  robotsTxt?: {
    enabled: boolean;
    mode: ManagedFileMode;
    /** Managed content to append/merge/replace */
    content?: string;
  };
  sitemap?: {
    enabled: boolean;
    mode: ManagedFileMode;
    /** Managed sitemap XML content */
    content?: string;
  };
  wellKnown?: {
    enabled: boolean;
    files: Record<string, {
      mode: Extract<ManagedFileMode, "replace" | "disabled">;
      /** File content served when mode is "replace" */
      content?: string;
    }>;
  };
  geo?: {
    enabled: boolean;
    injectJsonLd?: boolean;
    injectSummary?: boolean;
    enrichHeadings?: boolean;
    rules?: GeoPageRule[];
  };
}

/**
 * Merged configuration (SDK defaults + dashboard overrides)
 * Used internally by the pipeline.
 */
export interface ResolvedConfig {
  robotsTxt: {
    enabled: boolean;
    mode: ManagedFileMode;
    content?: string;
  };
  sitemap: {
    enabled: boolean;
    mode: ManagedFileMode;
    content?: string;
  };
  wellKnown: {
    enabled: boolean;
    files: Record<string, {
      mode: Extract<ManagedFileMode, "replace" | "disabled">;
      content?: string;
    }>;
  };
  geo: {
    enabled: boolean;
    injectJsonLd: boolean;
    injectSummary: boolean;
    enrichHeadings: boolean;
    rules: GeoPageRule[];
  };
}
