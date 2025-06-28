// Config -- update these accordingly!
const METADATA_URL = 'https://ipfs.io/ipfs/Qm.../NFT-Metadata.json';   // Link JSON NFT kamu di IPFS
const CONTRACT_ADDRESS = '0x...SmartContractAddress';                  // Kontrak NFT-mu
const TOKEN_ID = 0;   // Ganti sesuai NFT

// Instead of:
const provider = new ethers.providers.Web3Provider(window.ethereum);

// Use your own injected provider:
const provider = window.myWalletProvider // atau sesuai expose-mu

// Untuk signature:
const signer = provider.getSigner(); // custom, dari in-app wallet!

// Saat call kontrak:
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

const ABI = [
  "function addMessage(uint256 tokenId, string calldata message) external",
  "function getMessages(uint256 tokenId) view external returns (string[] memory)"
];

// Util: helper IPFS url
function ipfsUrl(x) {
  if (!x || !x.startsWith("ipfs://")) return x;
  return x.replace("ipfs://", "https://ipfs.io/ipfs/");
}

// Helper: load JS external & HTML modular
async function injectModuleJS(scriptUrl) {
  const s = document.createElement("script");
  s.src = ipfsUrl(scriptUrl);
  document.body.appendChild(s);
}

async function injectHTML(htmlUrl, containerId) {
  const html = await fetch(ipfsUrl(htmlUrl)).then(r=>r.text());
  document.getElementById(containerId).innerHTML = html;
}

// Google sheet pull (readonly) as table
async function showGoogleSheet(sheetUrl, containerId) {
  // Google Sheets CSV export (Works: only allow "Anyone with the link")
  let docId = sheetUrl.split('/d/')[1]?.split('/')[0];
  if (!docId) return;
  let csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
  let resp = await fetch(csvUrl);
  let txt = await resp.text();
  let rows = txt.split('\n').map(r => r.split(','));
  let html = '<table border="1" style="font-size:small;">' +
    rows.map(r => `<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('') + '</table>';
  document.getElementById(containerId).innerHTML = '<b>Google Sheet:</b>' + html;
}

// Load NFT metadata, render all modules according to its JSON!
async function loadMetadata() {
  const res = await fetch(METADATA_URL);
  const data = await res.json();

  // Load NFT image
  document.getElementById('nftimg').src = ipfsUrl(data.image);

  // Load Google Sheet if ada
  if (data.properties?.google_sheet_live)
    showGoogleSheet(data.properties.google_sheet_live, "dataaktif");

  // Inject custom HTML modular
  if (data.properties?.custom_html)
    await injectHTML(data.properties.custom_html, "custom-html");

  // Inject external logic JS modular
  if (data.properties?.custom_js)
    await injectModuleJS(data.properties.custom_js);

  // Info
  document.getElementById('infotxt').innerText = "Metadata loaded: " + data.name;

  // Load onchain messages (chat/goresan/historis input user)
  await loadMessages();
}

// Show chat/messages from smart contract (onchain!)
async function loadMessages() {
  if (!window.ethereum) return;
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  const msgs = await contract.getMessages(TOKEN_ID);
  document.getElementById('messages').innerHTML =
     (msgs.length ? "<b>Pesan/History Blockchain:</b><br/>" : "")
    + msgs.map(x => `<div>📝 ${x}</div>`).join('');
}

// Tambah pesan/goresan ke blockchain!
async function addMessage() {
  if (!window.ethereum) {
    alert("Metamask/web3 tidak aktif."); return;
  }
  const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const input = document.getElementById('msginput');
  const msg = input.value.trim();
  if (!msg) return;
  try {
    const tx = await contract.addMessage(TOKEN_ID, msg);
    await tx.wait();
    input.value = "";
    loadMessages();
  } catch(e) {
    alert("Gagal kirim: " + (e && e.message));
  }
}

  // App.js
let provider, signer;

if (window.myWalletProvider) {
   provider = window.myWalletProvider;
   signer = provider.getSigner();
} else if (window.ethereum) {
   provider = new ethers.providers.Web3Provider(window.ethereum);
   signer = provider.getSigner();
} else {
   // fallback: view only
   provider = ethers.getDefaultProvider();
  }
}

// Modular: jika ingin chatbox HTML & JS tertanam dinamis (dari IPFS, bukan hardcoded)
window.addEventListener('DOMContentLoaded', loadMetadata);
