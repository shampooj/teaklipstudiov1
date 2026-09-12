// Shopify Storefront API access (public storefront token, safe in the client)
// plus the product/variant listing the admin uses to pick live items.

export const SHOPIFY_STOREFRONT_URL = "https://nupoora-784.myshopify.com/api/2025-07/graphql.json";
export const SHOPIFY_STOREFRONT_TOKEN = "6a6653dc5956c7f18185083590def26d";
export const SHOP_URL = "https://teakbeauty.com";

export async function storefront<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e: { message: string }) => e.message).join("; "));
  return json.data as T;
}

export const numericId = (gid: string) => gid.split("/").pop() ?? gid;

export interface LiveVariant {
  id: string; // numeric
  title: string;
  availableForSale: boolean;
  price: string;
  compareAtPrice: string | null;
  currencyCode: string;
  imageUrl: string | null;
}

export interface LiveProduct {
  id: string;
  handle: string;
  title: string;
  availableForSale: boolean;
  imageUrl: string | null;
  rating: { value: number; max: number; count: number } | null;
  variants: LiveVariant[];
}

const PRODUCTS_QUERY = `
  query LiveProducts($first: Int!) {
    products(first: $first, sortKey: TITLE) {
      edges {
        node {
          id
          handle
          title
          availableForSale
          featuredImage { url }
          rating: metafield(namespace: "reviews", key: "rating") { value }
          ratingCount: metafield(namespace: "reviews", key: "rating_count") { value }
          variants(first: 100) {
            edges {
              node {
                id
                title
                availableForSale
                price { amount currencyCode }
                compareAtPrice { amount }
                image { url }
              }
            }
          }
        }
      }
    }
  }
`;

/** Products currently purchasable on the store, with their variants. */
export async function fetchLiveProducts(): Promise<LiveProduct[]> {
  type Raw = {
    products: {
      edges: {
        node: {
          id: string;
          handle: string;
          title: string;
          availableForSale: boolean;
          featuredImage: { url: string } | null;
          rating: { value: string } | null;
          ratingCount: { value: string } | null;
          variants: {
            edges: {
              node: {
                id: string;
                title: string;
                availableForSale: boolean;
                price: { amount: string; currencyCode: string };
                compareAtPrice: { amount: string } | null;
                image: { url: string } | null;
              };
            }[];
          };
        };
      }[];
    };
  };
  const data = await storefront<Raw>(PRODUCTS_QUERY, { first: 50 });
  return data.products.edges
    .map(({ node }) => {
      let rating: LiveProduct["rating"] = null;
      if (node.rating?.value) {
        try {
          const parsed = JSON.parse(node.rating.value) as { value?: string; scale_max?: string };
          const value = Number(parsed.value);
          if (Number.isFinite(value)) {
            rating = { value, max: Number(parsed.scale_max) || 5, count: Number(node.ratingCount?.value) || 0 };
          }
        } catch {
          // metafield not in the reviews JSON shape; skip stars
        }
      }
      return {
        id: numericId(node.id),
        handle: node.handle,
        title: node.title,
        availableForSale: node.availableForSale,
        imageUrl: node.featuredImage?.url ?? null,
        rating,
        variants: node.variants.edges.map(({ node: v }) => ({
          id: numericId(v.id),
          title: v.title,
          availableForSale: v.availableForSale,
          price: v.price.amount,
          compareAtPrice: v.compareAtPrice?.amount ?? null,
          currencyCode: v.price.currencyCode,
          imageUrl: v.image?.url ?? null,
        })),
      };
    })
    .filter((p) => p.availableForSale);
}
