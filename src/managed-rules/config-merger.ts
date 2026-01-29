/**
 * Config Merger
 *
 * Deep merges SDK code defaults with dashboard remote overrides.
 * Dashboard values always win.
 */

import type {
  ManagedRulesConfig,
  RemoteConfigBundle,
  ResolvedConfig,
} from "../types/managed-rules.types";
import type { GeoPageRule } from "../types/geo.types";

/**
 * Default resolved config (when nothing is configured)
 */
const DEFAULTS: ResolvedConfig = {
  robotsTxt: { enabled: false, mode: "append" },
  sitemap: { enabled: false, mode: "merge" },
  wellKnown: { enabled: false, files: {} },
  geo: {
    enabled: false,
    injectJsonLd: true,
    injectSummary: true,
    enrichHeadings: true,
    rules: [],
  },
};

/**
 * Merge SDK code defaults with dashboard remote overrides.
 * Dashboard values take priority over SDK code values.
 * If remote is null (API down or no config), SDK defaults are used.
 */
export function mergeConfig(
  sdkConfig: ManagedRulesConfig,
  remote: RemoteConfigBundle | null,
): ResolvedConfig {
  return {
    robotsTxt: mergeRobotsTxt(sdkConfig, remote),
    sitemap: mergeSitemap(sdkConfig, remote),
    wellKnown: mergeWellKnown(sdkConfig, remote),
    geo: mergeGeo(sdkConfig, remote),
  };
}

function mergeRobotsTxt(
  sdk: ManagedRulesConfig,
  remote: RemoteConfigBundle | null,
): ResolvedConfig["robotsTxt"] {
  const base = {
    enabled: sdk.robotsTxt?.enabled ?? DEFAULTS.robotsTxt.enabled,
    mode: sdk.robotsTxt?.mode ?? DEFAULTS.robotsTxt.mode,
  };

  if (!remote?.robotsTxt) return base;

  return {
    enabled: remote.robotsTxt.enabled ?? base.enabled,
    mode: remote.robotsTxt.mode ?? base.mode,
    content: remote.robotsTxt.content,
  };
}

function mergeSitemap(
  sdk: ManagedRulesConfig,
  remote: RemoteConfigBundle | null,
): ResolvedConfig["sitemap"] {
  const base = {
    enabled: sdk.sitemap?.enabled ?? DEFAULTS.sitemap.enabled,
    mode: sdk.sitemap?.mode ?? DEFAULTS.sitemap.mode,
  };

  if (!remote?.sitemap) return base;

  return {
    enabled: remote.sitemap.enabled ?? base.enabled,
    mode: remote.sitemap.mode ?? base.mode,
    content: remote.sitemap.content,
  };
}

function mergeWellKnown(
  sdk: ManagedRulesConfig,
  remote: RemoteConfigBundle | null,
): ResolvedConfig["wellKnown"] {
  const base = {
    enabled: sdk.wellKnown?.enabled ?? DEFAULTS.wellKnown.enabled,
    files: { ...(sdk.wellKnown?.files ?? {}) },
  };

  if (!remote?.wellKnown) {
    // SDK files don't have content — convert to resolved format
    const resolvedFiles: ResolvedConfig["wellKnown"]["files"] = {};
    for (const [name, fileConfig] of Object.entries(base.files)) {
      resolvedFiles[name] = { mode: fileConfig.mode };
    }
    return { enabled: base.enabled, files: resolvedFiles };
  }

  // Dashboard overrides
  const mergedFiles: ResolvedConfig["wellKnown"]["files"] = {};

  // Start with SDK files (no content)
  for (const [name, fileConfig] of Object.entries(base.files)) {
    mergedFiles[name] = { mode: fileConfig.mode };
  }

  // Overlay remote files (with content, dashboard wins)
  for (const [name, remoteFile] of Object.entries(remote.wellKnown.files)) {
    mergedFiles[name] = {
      mode: remoteFile.mode ?? mergedFiles[name]?.mode ?? "replace",
      content: remoteFile.content,
    };
  }

  return {
    enabled: remote.wellKnown.enabled ?? base.enabled,
    files: mergedFiles,
  };
}

function mergeGeo(
  sdk: ManagedRulesConfig,
  remote: RemoteConfigBundle | null,
): ResolvedConfig["geo"] {
  const sdkGeo = sdk.geo;
  const base: ResolvedConfig["geo"] = {
    enabled: sdkGeo?.enabled ?? DEFAULTS.geo.enabled,
    injectJsonLd: sdkGeo?.injectJsonLd ?? DEFAULTS.geo.injectJsonLd,
    injectSummary: sdkGeo?.injectSummary ?? DEFAULTS.geo.injectSummary,
    enrichHeadings: sdkGeo?.enrichHeadings ?? DEFAULTS.geo.enrichHeadings,
    rules: sdkGeo?.rules ?? [],
  };

  if (!remote?.geo) return base;

  // Merge rules: dashboard rules override SDK rules for matching patterns
  const mergedRules = mergeGeoRules(base.rules, remote.geo.rules || []);

  return {
    enabled: remote.geo.enabled ?? base.enabled,
    injectJsonLd: remote.geo.injectJsonLd ?? base.injectJsonLd,
    injectSummary: remote.geo.injectSummary ?? base.injectSummary,
    enrichHeadings: remote.geo.enrichHeadings ?? base.enrichHeadings,
    rules: mergedRules,
  };
}

/**
 * Merge GEO rules from SDK and dashboard.
 * Dashboard rules override SDK rules with the same urlPattern.
 * Rules from both sources are combined.
 */
function mergeGeoRules(
  sdkRules: GeoPageRule[],
  dashboardRules: GeoPageRule[],
): GeoPageRule[] {
  // Index dashboard rules by urlPattern for fast lookup
  const dashboardByPattern = new Map<string, GeoPageRule>();
  for (const rule of dashboardRules) {
    dashboardByPattern.set(rule.urlPattern, rule);
  }

  // Start with SDK rules, but override if dashboard has same pattern
  const merged: GeoPageRule[] = [];
  const usedPatterns = new Set<string>();

  for (const sdkRule of sdkRules) {
    const dashboardOverride = dashboardByPattern.get(sdkRule.urlPattern);
    if (dashboardOverride) {
      merged.push(dashboardOverride);
      usedPatterns.add(sdkRule.urlPattern);
    } else {
      merged.push(sdkRule);
    }
  }

  // Add dashboard-only rules (not in SDK)
  for (const dashboardRule of dashboardRules) {
    if (!usedPatterns.has(dashboardRule.urlPattern)) {
      merged.push(dashboardRule);
    }
  }

  return merged;
}
