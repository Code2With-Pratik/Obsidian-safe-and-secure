const FALLBACK_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value: string | undefined) {
  try {
    return new URL(value || FALLBACK_SITE_URL).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const SITE_NAME = "Obsidian Safe & Secure";
export const SITE_TITLE =
  "Obsidian Safe & Secure | Private Messaging, Calls & Collaboration";
export const SITE_DESCRIPTION =
  "Obsidian Safe & Secure is a privacy-focused communication platform for real-time messaging, voice and video calls, ghost rooms, stories, collaborative whiteboards, communities, secure files, and an optional AI assistant.";

export function getStructuredData() {
  const email = process.env.ORGANIZATION_CONTACT_EMAIL?.trim();
  const telephone = process.env.ORGANIZATION_CONTACT_PHONE?.trim();
  const streetAddress = process.env.ORGANIZATION_STREET_ADDRESS?.trim();
  const addressLocality = process.env.ORGANIZATION_ADDRESS_LOCALITY?.trim();
  const addressRegion = process.env.ORGANIZATION_ADDRESS_REGION?.trim();
  const postalCode = process.env.ORGANIZATION_POSTAL_CODE?.trim();
  const addressCountry = process.env.ORGANIZATION_ADDRESS_COUNTRY?.trim();
  const hasAddress = Boolean(
    streetAddress || addressLocality || addressRegion || postalCode || addressCountry
  );

  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Obsidian Labs",
    url: SITE_URL,
    logo: `${SITE_URL}/Obsidian_Logo.png`,
    description: SITE_DESCRIPTION,
    sameAs: [
      "https://github.com/Code2With-Pratik/Obsidian-safe-and-secure",
      "https://deepwiki.com/Code2With-Pratik/Obsidian-safe-and-secure"
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/contact`,
      availableLanguage: ["English"],
      ...(email ? { email } : {}),
      ...(telephone ? { telephone } : {})
    },
    ...(hasAddress
      ? {
          address: {
            "@type": "PostalAddress",
            ...(streetAddress ? { streetAddress } : {}),
            ...(addressLocality ? { addressLocality } : {}),
            ...(addressRegion ? { addressRegion } : {}),
            ...(postalCode ? { postalCode } : {}),
            ...(addressCountry ? { addressCountry } : {})
          }
        }
      : {})
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en"
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#application`,
        name: SITE_NAME,
        alternateName: "Obsidian",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "CommunicationApplication",
        applicationSubCategory: "Secure messaging and collaboration",
        operatingSystem: "Web, Android",
        browserRequirements: "Requires a modern browser with JavaScript enabled",
        image: `${SITE_URL}/og-default.jpg`,
        author: { "@id": `${SITE_URL}/#organization` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/OnlineOnly"
        },
        featureList: [
          "Real-time private and group messaging",
          "Voice and video calls",
          "Ghost rooms and communities",
          "Stories and media sharing",
          "Collaborative whiteboards",
          "Secure file vault",
          "Optional AI assistant"
        ]
      }
    ]
  };
}

