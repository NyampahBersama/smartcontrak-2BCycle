// === KONFIGURASI ===
// Archive ERC721 (blockviewer)
const CONTRACT_ARCHIVE = "0xDD4BEa2145f6A761f7B63dbeD5952bb421DC2869";
const ABI_ARCHIVE = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];
// SBT (Soulbound NFT) Mintable by owner. Sesi demo: backend minter pakai relayer, atau mint via signature/api
const CONTRACT_SBT = "0xFC7C4E1dc5478332516552E00b54494945e41Ccd";
const ABI_SBT = [
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, string memory uri) external returns (uint256)",
  "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)",
  "function tokenURI(uint256) view returns (string)"
];
const RPC_BASE = "https://mainnet.base.org";

// Demo: Token ID Archive default = 0
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tokenId').value = 0;
  if(window.ethereum) window.ethereum.request({method: "eth_requestAccounts"});
  loadAll();
  checkSBT();
});

// Loader Archive NFT dan History Mint/Transfer
async function loadAll() {
  const tokenId = parseInt(document.getElementById('tokenId').value || "0", 10);
  await loadNFT(tokenId);
  await loadHistory(tokenId);
}

// Loader metadata Archive
async function loadNFT(tokenId) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_BASE);
  const contract = new ethers.Contract(CONTRACT_ARCHIVE, ABI_ARCHIVE, provider);
  let owner = "-", uri = "";
  try {
    owner = await contract.ownerOf(tokenId);
    uri = await contract.tokenURI(tokenId);
  } catch (e) {
    document.getElementById('meta').innerHTML = "<b>Token belum ada atau burned.</b>";
    document.getElementById('imgNFT').style.display = "none";
    return;
  }
  let meta = {};
  try {
    let metaURL = toHTTP(uri);
    meta = await (await fetch(metaURL)).json();
  } catch (e) { meta = {} }
  document.getElementById('meta').innerHTML =
    `<b>Name:</b> ${meta.name || "-"}<br/>
     <b>Description:</b> ${meta.description || "-"}<br/>
     <b>TokenID:</b> ${tokenId}<br/>
     <b>Owner:</b> <code>${owner}</code>`;
  if(meta.image) {
    document.getElementById('imgNFT').src = toHTTP(meta.image);
    document.getElementById('imgNFT').style.display = "block";
  } else {
    document.getElementById('imgNFT').style.display = "none";
  }
}

// Loader event Transfer (mint/transfer history)
async function loadHistory(tokenId) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_BASE);
  const iface = new ethers.utils.Interface([
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ]);
  const filter = {
    address: CONTRACT_ARCHIVE,
    topics: [iface.getEventTopic("Transfer"), null, null, ethers.utils.hexZeroPad(ethers.BigNumber.from(tokenId).toHexString(), 32)]
  };
  let events = []; let html = "";
  try {
    events = await provider.getLogs({ ...filter, fromBlock: 0, toBlock: "latest" });
  } catch (e) {}
  html = "<b>Riwayat:</b><div>";
  if(events.length === 0) {
    html += "Belum ada histori event.";
  } else {
    for(const e of events) {
      const log = iface.parseLog(e);
      const t = await blockTimestamp(provider, e.blockNumber);
      html += `<div>Block <b>${e.blockNumber}</b> <small>(${t})</small>: FROM <code>${log.args.from}</code> TO <code>${log.args.to}</code></div>`;
    }
  }
  html += "</div>";
  document.getElementById('history').innerHTML = html;
}

// Helper timestamp blok ke date
async function blockTimestamp(provider, blk) {
  try{
    const b = await provider.getBlock(blk);
    if(!b) return "-";
    const d = new Date(b.timestamp*1000);
    return d.toISOString().replace("T"," ").slice(0,16) + " UTC";
  }catch(e){return "-";}
}

function toHTTP(uri) {
  if(!uri) return "";
  if(uri.startsWith("ipfs://")) return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  return uri;
}

// --- SBT REGISTER ---
async function checkSBT() {
  if(!window.ethereum) return;
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const user = (await provider.listAccounts())[0];
  if(!user) return;

  const sbt = new ethers.Contract(CONTRACT_SBT, ABI_SBT, provider);
  let bal = 0;
  try {
    bal = await sbt.balanceOf(user);
  } catch(e){bal=0;}
  let status = "";
  if(bal && bal.gt(0)) {
    status = `<span class='badge'>Kamu sudah terdaftar & punya NFT SBT</span><br/>`;
    document.getElementById("btnDaftar").style.display = "none";
  } else {
    status = "<span style='color:#b22;'>Kamu belum punya SBT. Daftar di bawah ini.</span>";
    document.getElementById("btnDaftar").disabled = false;
    document.getElementById("btnDaftar").style.display = "inline-block";
  }
  document.getElementById("statusSBT").innerHTML = status;
}

// Trigger mint SBT untuk user (trigger owner/backend/minter SBT)
async function registerSBT() {
  document.getElementById("notif").innerText = "";
  if(!window.ethereum) {
    document.getElementById("notif").innerText = "Web3 wallet tidak ada.";
    return;
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const user = (await provider.listAccounts())[0];
  if(!user) {
    document.getElementById("notif").innerText = "Connect wallet dulu.";
    return;
  }
  const sbt = new ethers.Contract(CONTRACT_SBT, ABI_SBT, provider.getSigner());
  
  // KAMU HARUS PASTIKAN walletmu (signer) adalah minter/owner SBT. Kalau tidak, trigger UI webhook backend kamu.
  // Demo: mint(uri), gunakan URI metadata default/demo.  
  let demoURI = "ipfs://QmHash/your_sbt_certificate.json";
  document.getElementById("btnDaftar").disabled = true;
  document.getElementById("notif").innerText = "Minting SBT...";
  try {
    let tx = await sbt.mint(user, demoURI); // Mint via onlyOwner!
    await tx.wait();
    document.getElementById("notif").innerText = "Sukses mint SBT!";
    checkSBT();
  } catch(e) {
    document.getElementById("notif").innerText = "Mint gagal. Hubungi admin/minter SBT (mint hanya owner)!";
    document.getElementById("btnDaftar").disabled = false;
  }
}
