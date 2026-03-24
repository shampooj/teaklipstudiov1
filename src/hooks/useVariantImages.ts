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
      }
    }
  }
`;

export interface VariantImageData {
  variantId: string;
  imageUrl: string | null;
  altText: string | null;
  price: string | null;
  productTitle: string | null;
  productHandle: string | null;
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
          map[numericId] = {
            variantId: numericId,
            imageUrl: node.image?.url ?? null,
            altText: node.image?.altText ?? null,
            price: node.price?.amount ?? null,
            productTitle: node.product?.title ?? null,
            productHandle: node.product?.handle ?? null,
          };
        }
        setData(map);
      })
      .catch(console.error);
  }, [variantIds.join(",")]);

  return data;
}
