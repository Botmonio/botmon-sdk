/**
 * Schema Generator
 *
 * Generates JSON-LD structured data for each page type.
 * Uses HTML extraction to populate schema fields.
 */

import type {
  PageType,
  GeneratedSchema,
  GeoPageRule,
} from "../types/geo.types";
import {
  extractTitle,
  extractOgTitle,
  extractOgImage,
  extractMetaDescription,
  extractFaqPairs,
  extractOrderedListSteps,
  extractPrices,
} from "./html-utils";

/**
 * Generate JSON-LD schema for a page based on its detected type
 */
export function generateSchema(
  pageType: PageType,
  html: string,
  url: URL,
  matchingRule: GeoPageRule | null,
): GeneratedSchema | null {
  const title = extractOgTitle(html) || extractTitle(html) || "";
  const description = extractMetaDescription(html) || "";
  const image = extractOgImage(html);

  // If rule has custom JSON-LD, merge it
  const customJsonLd = matchingRule?.customJsonLd;

  switch (pageType) {
    case "product":
      return generateProductSchema(title, description, image, url, html, customJsonLd);
    case "article":
      return generateArticleSchema(title, description, image, url, html, customJsonLd);
    case "docs":
      return generateDocsSchema(title, description, url, customJsonLd);
    case "faq":
      return generateFaqSchema(title, html, url, customJsonLd);
    case "how-to":
      return generateHowToSchema(title, description, html, url, customJsonLd);
    case "pricing":
      return generatePricingSchema(title, description, url, html, customJsonLd);
    case "comparison":
      return generateComparisonSchema(title, description, url, customJsonLd);
    case "generic":
    default:
      return generateGenericSchema(title, description, url, customJsonLd);
  }
}

function generateProductSchema(
  title: string,
  description: string,
  image: string | null,
  url: URL,
  html: string,
  custom?: Record<string, unknown>,
): GeneratedSchema {
  const prices = extractPrices(html);
  const schema: GeneratedSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description,
    url: url.href,
    ...(image && { image }),
    ...(prices.length > 0 && {
      offers: {
        "@type": "Offer",
        price: prices[0].value,
        priceCurrency: prices[0].currency,
        availability: "https://schema.org/InStock",
      },
    }),
    ...custom,
  };
  return schema;
}

function generateArticleSchema(
  title: string,
  description: string,
  image: string | null,
  url: URL,
  html: string,
  custom?: Record<string, unknown>,
): GeneratedSchema {
  // Try to extract published date
  const dateMatch = html.match(
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
  );
  const publishedDate = dateMatch ? dateMatch[1] : undefined;

  const schema: GeneratedSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: url.href,
    ...(image && { image }),
    ...(publishedDate && { datePublished: publishedDate }),
    ...custom,
  };
  return schema;
}

function generateDocsSchema(
  title: string,
  description: string,
  url: URL,
  custom?: Record<string, unknown>,
): GeneratedSchema {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: url.href,
    ...custom,
  };
}

function generateFaqSchema(
  title: string,
  html: string,
  url: URL,
  custom?: Record<string, unknown>,
): GeneratedSchema {
  const pairs = extractFaqPairs(html);

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: title,
    url: url.href,
    mainEntity: pairs.map((pair) => ({
      "@type": "Question",
      name: pair.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: pair.answer,
      },
    })),
    ...custom,
  };
}

function generateHowToSchema(
  title: string,
  description: string,
  html: string,
  url: URL,
  custom?: Record<string, unknown>,
): GeneratedSchema {
  const steps = extractOrderedListSteps(html);

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    url: url.href,
    step: steps.map((text, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text,
    })),
    ...custom,
  };
}

function generatePricingSchema(
  title: string,
  description: string,
  url: URL,
  html: string,
  custom?: Record<string, unknown>,
): GeneratedSchema {
  const prices = extractPrices(html);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: url.href,
    ...(prices.length > 0 && {
      offers: prices.map((p) => ({
        "@type": "Offer",
        price: p.value,
        priceCurrency: p.currency,
      })),
    }),
    ...custom,
  };
}

function generateComparisonSchema(
  title: string,
  description: string,
  url: URL,
  custom?: Record<string, unknown>,
): GeneratedSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: url.href,
    ...custom,
  };
}

function generateGenericSchema(
  title: string,
  description: string,
  url: URL,
  custom?: Record<string, unknown>,
): GeneratedSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: url.href,
    ...custom,
  };
}
