import { useState, useEffect } from "react";

const SHOPIFY_STOREFRONT_URL = "https://nupoora-784.myshopify.com/api/2025-07/graphql.json";
const SHOPIFY_STOREFRONT_TOKEN = "6a6653dc5956c7f18185083590def26d";

const VARIANT_IMAGE_QUERY = `
  query GetVariantImages($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        title
        image {
          url
          altText
        }
        price {
          amount
          currencyCode
        }
        product {
          title
          handle
        }
        metaImages: metafield(namespace: "custom", key: "image") {
          references(first: 10) {
            edges {
              node {
                ... on MediaImage {
                  image {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export interface MetaImage {
  url: string;
  altText: string | null;
}

export interface VariantImageData {
  variantId: string;
  imageUrl: string | null;
  altText: string | null;
  price: string | null;
  productTitle: string | null;
  productHandle: string | null;
  metaImages: MetaImage[];
}

/**
 * Given the user's skin tone id and the list of metafield images,
 * pick the one whose filename best matches. Falls back to the first non-packshot image.
 */
export function getSkinToneImage(
  skinToneId: string,
  metaImages: MetaImage[]
): MetaImage | null {
  if (metaImages.length === 0) return null;

  // Map skin-tone ids to filename keywords
  const keywordMap: Record<string, string[]> = {
    "light-brown": ["light"],
    "medium-brown": ["medium"],
    "deep-brown": ["dark", "deep"],
    "rich-brown": ["dark", "deep"],
  };

  const keywords = keywordMap[skinToneId] || [];

  for (const kw of keywords) {
    const match = metaImages.find((img) => {
      const filename = img.url.split("/").pop()?.toLowerCase() ?? "";
      return filename.includes(kw) && !filename.includes("packshot") && !filename.includes("smear");
    });
    if (match) return match;
  }

  // Fallback: first non-packshot, non-smear image
  return (
    metaImages.find((img) => {
      const filename = img.url.split("/").pop()?.toLowerCase() ?? "";
      return !filename.includes("packshot") && !filename.includes("smear");
    }) ?? null
  );
}

export function useVariantImages(variantIds: string[]): Record<string, VariantImageData> {
  const [data, setData] = useState<Record<string, VariantImageData>>({});

  useEffect(() => {
    if (variantIds.length === 0) return;

    const globalIds = variantIds.map((id) => `gid://shopify/ProductVariant/${id}`);

    fetch(SHOPIFY_STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: VARIANT_IMAGE_QUERY, variables: { ids: globalIds } }),
    })
      .then((res) => res.json())
      .then((json) => {
        const map: Record<string, VariantImageData> = {};
        const nodes = json?.data?.nodes ?? [];
        for (const node of nodes) {
          if (!node?.id) continue;
          const numericId = node.id.replace("gid://shopify/ProductVariant/", "");

          const metaImages: MetaImage[] = [];
          const edges = node.metaImages?.references?.edges ?? [];
          for (const edge of edges) {
            const img = edge?.node?.image;
            if (img?.url) {
              metaImages.push({ url: img.url, altText: img.altText ?? null });
            }
          }

          map[numericId] = {
            variantId: numericId,
            imageUrl: node.image?.url ?? null,
            altText: node.image?.altText ?? null,
            price: node.price?.amount ?? null,
            productTitle: node.product?.title ?? null,
            productHandle: node.product?.handle ?? null,
            metaImages,
          };
        }
        setData(map);
      })
      .catch(console.error);
  }, [variantIds.join(",")]);

  return data;
}
