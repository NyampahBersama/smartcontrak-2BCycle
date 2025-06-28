// --- Utility: Parse query string
function query(key) {
  const url = new URL(window.location.href);
  return url.searchParams.get(key);
}
const PRODUCT = query("product") || "CARBON_SBT";
const THEME = query("theme") || "default";
// [Replace with your registry/router - see previous answer]
const ROUTER = "0xYourMarketplaceRouterAddress";
const ROUTER_ABI = ["function getMarket(string) view returns(address)"];
const ABI_MARKET = [/* ABI per produk, see registry */];
const RPC = "https://mainnet.base.org";
// Sample: load universal panel for product market
async function loadPanel() {
  const div = document.getElementById("marketpanel");
  div.innerHTML = `<h2>Marketplace: ${PRODUCT.replace("_"," ")}</h2>
    <div id="content">Loading market...</div>`;
  const ethersProvider = new window.ethers.providers.JsonRpcProvider(RPC);
  const router = new window.ethers.Contract(ROUTER, ROUTER_ABI, ethersProvider);
  const marketAddr = await router.getMarket(PRODUCT);
  // Fetch list & render - pseudocode (replace with full render from previous answers!)
  let html = "<table border=0 width=99%><tr><th>ID</th><th>Seller</th><th>Price</th></tr>";
  // Replace for loop with dynamic loader
  for(let i=0;i<20;i++) {
    // let data = await market.methods.fetchListing(i);
    html += `<tr><td>${i}</td><td>0xABC..</td><td>123 USDC</td></tr>`; // Placeholder
  }
  html += "</table>";
  document.getElementById("content").innerHTML = html;
}
// Ready: trigger loader!
window.addEventListener('DOMContentLoaded', loadPanel);
