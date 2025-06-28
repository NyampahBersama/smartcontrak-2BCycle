// === SETTINGS ===
const CONTRACT_ADDRESS = "0xDD4BEa2145f6A761f7B63dbeD5952bb421DC2869";
const ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];
const RPC_BASE = "https://mainnet.base.org";  // (atau endpoint Base public RPC lain)

async function ipfsUrl(uri) {
  if (!uri) return "";
  if (uri.startsWith("ipfs://"))
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  return uri;
}

// Loader utama: Info NFT + histori
async function loadAll() {
  const tokenId = parseInt(document.getElementById('tokenId').value || "0", 10);
  document.getElementById('infotxt').innerText = "Loading data...";
  await loadNFT(tokenId);
  await loadHistory(tokenId);
  document.getElementById('infotxt').innerText = "Selesai.";
}

async function loadNFT(tokenId) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_BASE);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  let owner = "(tidak diketahui)";
  let uri = "";
  try {
    owner = await contract.ownerOf(tokenId);
    uri = await contract.tokenURI(tokenId);
  } catch(e) {
    document.getElementById('meta').innerHTML = "<b>Token belum ada atau burned.</b>";
    document.getElementById('nftimg').style.display = "none";
    return;
  }
  let meta = {};
  try {
    const metaURL = await ipfsUrl(uri);
    let resp = await fetch(metaURL);
    meta = await resp.json();
  } catch(e) { meta = {}; }

  document.getElementById('meta').innerHTML =
    `<b>Name:</b> ${meta.name || "-"}<br/>
     <b>Description:</b> ${meta.description || "-"}<br/>
     <b>Token ID:</b> ${tokenId}<br/>
     <b>Owner:</b> <code style="font-size:90%;">${owner}</code><br/>
     <b>Onchain Archive:</b> <code>${CONTRACT_ADDRESS}</code>`;
  if(meta.image) {
    document.getElementById('nftimg').src = await ipfsUrl(meta.image);
    document.getElementById('nftimg').style.display = "block";
  } else {
    document.getElementById('nftimg').style.display = "none";
  }
}

// Loader event/history: Mint, Transfer, Burn, Freeze, Dll
async function loadHistory(tokenId) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_BASE);
  const iface = new ethers.utils.Interface([
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ]);
  // Filter Transfer events (mint, burn, transfer)
  const filter = {
    address: CONTRACT_ADDRESS,
    topics: [
      iface.getEventTopic("Transfer"),
      null,
      null,
      ethers.utils.hexZeroPad(ethers.BigNumber.from(tokenId).toHexString(), 32)
    ]
  };
  let events = [];
  try {
    events = await provider.getLogs({...filter, fromBlock: 0, toBlock: "latest"});
  } catch(e) {}
  // Render simple timeline
  let html = "<b>Riwayat NFT:</b><div class='events'>";
  if(events.length === 0) {
    html += "Belum ada histori event onchain (mint/burn/transfer)";
  } else {
    for(const e of events) {
      const log = iface.parseLog(e);
      const time = await blockTimestamp(provider, e.blockNumber);
      html += `<div>Block <b>${e.blockNumber}</b> (<small>${time}</small>) : FROM <code>${log.args.from}</code> TO <code>${log.args.to}</code></div>`;
    }
  }
  html += "</div>";
  document.getElementById('history').innerHTML = html;
}

// Helper waktu blok ke tanggal
async function blockTimestamp(provider, blk) {
  try{
    const b = await provider.getBlock(blk);
    if(!b) return "-";
    const d = new Date(b.timestamp*1000);
    return d.toISOString().replace("T"," ").slice(0,16) + " UTC";
  }catch(e){return "-";}
}

// Muatan awal
window.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('tokenId').value = 0;
  loadAll();
});
