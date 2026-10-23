import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const baseUrl = (process.env.AGENT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const expectCompleteOrganization =
  process.env.AGENT_EXPECT_COMPLETE_ORGANIZATION === "1";

async function request(path, accept) {
  return fetch(`${baseUrl}${path}`, {
    headers: accept ? { Accept: accept } : {},
    redirect: "manual"
  });
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|nbsp|quot|#39);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assertVaryAccept(response) {
  const vary = response.headers.get("vary") || "";
  assert.match(vary, /(?:^|,)\s*accept\s*(?:,|$)/i);
}

test("repository metadata exposes the canonical brand and live application", async () => {
  const [readme, packageSource] = await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8")
  ]);
  const packageMetadata = JSON.parse(packageSource);

  assert.match(readme, /Obsidian Safe &amp; Secure Messaging/);
  assert.match(readme, /https:\/\/obsidian-safe-and-secure\.onrender\.com/);
  assert.equal(
    packageMetadata.homepage,
    "https://obsidian-safe-and-secure.onrender.com"
  );
  assert.match(packageMetadata.description, /Obsidian Safe & Secure/);
});

test("homepage serves substantial semantic HTML and JSON-LD", async () => {
  const response = await request("/", "text/html");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/html/i);

  const html = await response.text();
  const text = visibleText(html);
  assert.ok(text.length >= 500, `expected at least 500 visible characters, received ${text.length}`);
  assert.match(html, /<title>Obsidian Safe &amp; Secure Messaging/i);
  assert.match(html, /<h1[^>]*>[\s\S]*Obsidian Safe &amp; Secure[\s\S]*messaging/i);
  assert.match(html, /<h2[^>]*>/i);

  const jsonLdMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  assert.ok(jsonLdMatch, "expected JSON-LD on the homepage");
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  const types = jsonLd["@graph"].map((item) => item["@type"]);
  assert.ok(types.includes("Organization"));
  assert.ok(types.includes("Brand"));
  assert.ok(types.includes("WebApplication"));
  assert.ok(types.includes("WebSite"));

  const organization = jsonLd["@graph"].find((item) => item["@type"] === "Organization");
  const brand = jsonLd["@graph"].find((item) => item["@type"] === "Brand");
  const application = jsonLd["@graph"].find((item) => item["@type"] === "WebApplication");
  assert.ok(organization.name);
  assert.equal(organization.contactPoint["@type"], "ContactPoint");
  assert.equal(organization.contactPoint.contactType, "customer support");
  assert.equal(brand.name, "Obsidian Safe & Secure");
  assert.ok(brand.alternateName.includes("Obsidian Safe & Secure Messaging"));
  assert.equal(application.name, "Obsidian Safe & Secure");
  assert.ok(application.alternateName.includes("Obsidian Safe & Secure Messaging"));
  assert.equal(organization.brand["@id"], brand["@id"]);
  assert.equal(application.brand["@id"], brand["@id"]);

  if (expectCompleteOrganization) {
    assert.match(organization.contactPoint.email || "", /@/);
    assert.ok(organization.contactPoint.telephone);
    assert.equal(organization.address["@type"], "PostalAddress");
    for (const field of [
      "streetAddress",
      "addressLocality",
      "addressRegion",
      "postalCode",
      "addressCountry"
    ]) {
      assert.ok(organization.address[field], `expected Organization.address.${field}`);
    }
  }
});

test("homepage negotiates Markdown using quality values", async () => {
  const markdownResponse = await request(
    "/",
    "text/markdown, text/html;q=0.8, */*;q=0.1"
  );
  assert.equal(markdownResponse.status, 200);
  assert.match(markdownResponse.headers.get("content-type") || "", /^text\/markdown/i);
  assertVaryAccept(markdownResponse);
  const markdown = await markdownResponse.text();
  assert.ok(markdown.length >= 500);
  assert.match(markdown, /^# Obsidian Safe & Secure Messaging/m);
  assert.match(markdown, /## When to use Obsidian/);

  const htmlPreferred = await request("/", "text/html, text/markdown;q=0.5");
  assert.equal(htmlPreferred.status, 200);
  assert.match(htmlPreferred.headers.get("content-type") || "", /^text\/html/i);
});

test("404 responses support both HTML and Markdown representations", async () => {
  const path = "/__agent-readiness-missing-page";
  const markdownResponse = await request(path, "text/markdown");
  assert.equal(markdownResponse.status, 404);
  assert.match(markdownResponse.headers.get("content-type") || "", /^text\/markdown/i);
  assertVaryAccept(markdownResponse);
  const markdown = await markdownResponse.text();
  assert.ok(markdown.length >= 20);
  assert.match(markdown, /llms\.txt/);
  assert.match(markdown, /sitemap\.xml/);

  const htmlResponse = await request(path, "text/html");
  assert.equal(htmlResponse.status, 404);
  assert.match(htmlResponse.headers.get("content-type") || "", /^text\/html/i);
  const html = await htmlResponse.text();
  assert.match(html, /Return home/);
});

test("llms.txt gives specific when-to-use and interaction guidance", async () => {
  const response = await request("/llms.txt", "text/plain");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/plain/i);
  const body = await response.text();
  assert.match(body, /## When to use this site/);
  assert.match(body, /## When not to use this site/);
  assert.match(body, /## How agents should interact/);
  assert.match(body, /Accept: text\/markdown/);
});

test("sitemap and robots expose public discovery endpoints", async () => {
  const sitemapResponse = await request("/sitemap.xml", "application/xml");
  assert.equal(sitemapResponse.status, 200);
  assert.match(sitemapResponse.headers.get("content-type") || "", /xml/i);
  const sitemap = await sitemapResponse.text();
  for (const path of ["/about", "/contact", "/privacy", "/terms"]) {
    assert.match(sitemap, new RegExp(`<loc>[^<]*${path}</loc>`));
  }
  assert.match(sitemap, /<lastmod>/);

  const robotsResponse = await request("/robots.txt", "text/plain");
  assert.equal(robotsResponse.status, 200);
  const robots = await robotsResponse.text();
  assert.match(robots, /Sitemap: .*\/sitemap\.xml/i);
  assert.match(robots, /Allow: \/about/i);
});

for (const path of ["/about", "/contact", "/privacy"]) {
  test(`${path} is a substantial public trust page`, async () => {
    const response = await request(path, "text/html");
    assert.equal(response.status, 200);
    const text = visibleText(await response.text());
    assert.ok(text.length >= 500, `${path} returned only ${text.length} visible characters`);
  });
}

