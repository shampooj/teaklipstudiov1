import HomepageBestsellers from "./HomepageBestsellers";

// Admin tab for site-wide features that render on the Shopify storefront via
// pasted Custom Liquid snippets. Each feature is a section; its config lives
// in the web_features table under its own key.
const WebFeaturesTab = () => (
  <div className="space-y-5">
    <HomepageBestsellers />
  </div>
);

export default WebFeaturesTab;
