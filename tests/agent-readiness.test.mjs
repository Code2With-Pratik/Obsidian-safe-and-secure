import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = (process.env.AGENT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

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

test("homepage serves substantial semantic HTML and JSON-LD", async () => {
  const response = await request("/", "text/html");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/html/i);

  const html = await response.text();
  const text = visibleText(html);
  assert.ok(text.length >= 500, `expected at least 500 visible characters, received ${text.length}`);
  assert.match(html, /<h1[^>]*>[\s\S]*Obsidian/i);
  assert.match(html, /<h2[^>]*>/i);

  const jsonLdMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  assert.ok(jsonLdMatch, "expected JSON-LD on the homepage");
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  const types = jsonLd["@graph"].map((item) => item["@type"]);
  assert.ok(types.includes("Organization"));
  assert.ok(types.includes("WebApplication"));
  assert.ok(types.includes("WebSite"));
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
  assert.match(markdown, /^# Obsidian Safe & Secure/m);
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

