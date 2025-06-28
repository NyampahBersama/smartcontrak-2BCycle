// GANTI dengan address contract-mu!
const MARKET_ADDR = "0xYourMarketplaceAddress";
const SBT_ADDR = "0xYourCarbonCreditSBT";
const USDC_ADDR = "0xYourUSDC";
const ABI_MARKET = [
  "function list(uint256,uint256) external",
  "function buy(uint256) external",
  "function listings(uint256) view returns(address,uint256,bool)",
];
const ABI_SBT = [
  "function ownerOf(uint256) view returns(address)",
  "function tokenURI(uint256) view returns(string memory)"
];
const ABI_USDC = [
  "function approve(address,uint256) external returns(bool)"
];

// Example registry/reward: bisa direct ke modul registry utility kamu.
const REG_ADDR = "0xYourRegistryAddress";
const ABI_REG = [
  "function userScore(address) view returns(uint256)",
  "function byUser(address) view returns(uint256[])",
  "function entries(uint256) view returns(address,uint8,string,uint256,uint8,address,uint256)"
];

const RPC_URL = "https://mainnet.base.org";

// == List NFT SBT
async function listSBT() {
  const id = document.getElementById("tokenIdList").value;
  const price = parseFloat(document.getElementById("priceList").value);
  let notif = document.getElementById("notifList"); notif.innerText = "";
  if(!id || !price) {notif.innerText="Isi tokenID & harga!";return;}
  try {
    await window.ethereum.request({method:"eth_requestAccounts"});
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const market = new ethers.Contract(MARKET_ADDR, ABI_MARKET, signer);
    // (Pastikan SBT peserta sudah diapprove, jika mode approval)
    let tx = await market.list(id, ethers.utils.parseUnits(String(price),6)); // USDC decimals=6
    notif.innerText = "Menunggu konfirmasi transaksi...";
    await tx.wait();
    notif.innerText = "NFT SBT sukses di-list!";
    setTimeout(loadMarket, 2200);
  } catch(e) { notif.innerText = "List gagal: "+(e&&e.message?e.message:e);}
}

// == Browse Market
async function loadMarket() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const market = new ethers.Contract(MARKET_ADDR, ABI_MARKET, provider);
  const sbt = new ethers.Contract(SBT_ADDR, ABI_SBT, provider);

  let html = "";
  for(let i=0;i<300;i++){
    let d;
    try{ d = await market.listings(i); }
    catch(e){ continue; }
    if(!d || !d.active) continue;
    let seller = d.seller, price = d.price;
    let meta = {};
    try{
      const uri = await sbt.tokenURI(i); 
      const metaUrl = uri.startsWith("ipfs://") ? uri.replace("ipfs://", "https://ipfs.io/ipfs/") : uri;
      meta = await (await fetch(metaUrl)).json();
    }catch(e){meta={};}
    html += `<tr>
      <td>${i}</td>
      <td>${meta?.attributes?.[0]?.value||"-"}</td>
      <td><code>${seller.slice(0,6)}...${seller.slice(-4)}</code></td>
      <td><b>${ethers.utils.formatUnits(price,6)}</b></td>
      <td><button class="btn" onclick="buySBT(${i},${price})">Buy</button></td>
    </tr>`;
  }
  document.getElementById("marketRows").innerHTML = html||"<tr><td colspan=5>No listing.</td></tr>";
}

// == Buy NFT SBT (retire credit!)
async function buySBT(id,price) {
  let notif = document.getElementById("notifBuy"); notif.innerText = "Memproses...";
  try {
    await window.ethereum.request({method:"eth_requestAccounts"});
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const usdc = new ethers.Contract(USDC_ADDR, ABI_USDC, signer);
    // approve USDC
    let tx1 = await usdc.approve(MARKET_ADDR, price);
    await tx1.wait();
    const market = new ethers.Contract(MARKET_ADDR, ABI_MARKET, signer);
    let tx2 = await market.buy(id);
    notif.innerText = "Membeli/retire credit... Wait confirmation.";
    await tx2.wait();
    notif.innerText = "Sukses: credit retired onchain!";
    setTimeout(loadMarket, 2000);
  } catch(e) { notif.innerText = "Beli gagal: "+(e&&e.message?e.message:e);}
}

// == Registry & Reward Panel (intregrasi scoring/point/kebadgan)
async function loadRewardPanel() {
  let html = ""; let score="";
  if(!window.ethereum) { html="Wallet tidak terdeteksi."; }
  else {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const addr = (await provider.listAccounts())[0];
    const onchain = new ethers.providers.JsonRpcProvider(RPC_URL);
    const reg = new ethers.Contract(REG_ADDR, ABI_REG, onchain);
    try{
      let ttl = await reg.userScore(addr);
      score = `<span class='badge'>Total Point/Reward: ${ttl}</span><br/>`;
      let lst = await reg.byUser(addr);
      html += "<b>Riwayat:</b><ul style='font-size:0.97em;'>";
      for(let i=lst.length-1;i>=0&&i>lst.length-11;i--){
        let e=await reg.entries(lst[i]);
        html += `<li>[${e.ts}] Type:${e.ptype} — Status:${e.status} — Score:${e.score||0} — <code>${e.metaCID}</code></li>`;
      }
      html += "</ul>";
    }catch(e){score="";html="Data tidak ditemukan.";}
    html = score+html;
  }
  document.getElementById("rewardPanel").innerHTML = html;
}

window.addEventListener('DOMContentLoaded',()=>{
  loadMarket();
  loadRewardPanel();
});
