// === CONFIG EDIT SESUAI ===
const METADATA_URL = 'https://ipfs.io/ipfs/Qm.../NFT-Metadata.json'; // Metadata NFT modularmu
const CONTRACT_ADDRESS = '0x...SmartContractAddress';
const TOKEN_ID = 0;    // TokenId NFT
const ABI = [
  "function addMessage(uint256 tokenId, string calldata message) external",
  "function getMessages(uint256 tokenId) view external returns (string[] memory)"
];

// IPFS helper
function ipfsUrl(x){
  if (x && x.startsWith("ipfs://")) return x.replace("ipfs://", "https://ipfs.io/ipfs/");
  return x;
}

// === UNIVERSAL PROVIDER: Prioritas wallet custom (window.myWalletProvider) lalu Metamask, lalu read-only ===
async function getProviderAndSigner() {
  let provider, signer, isWritable = false, address = '';
  if (window.myWalletProvider) {
    // Custom wallet-mu: window.myWalletProvider sudah harus Ethers.js compatible
    provider = window.myWalletProvider;
    signer = provider.getSigner();
    isWritable = true;
    address = await signer.getAddress();
  } else if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    isWritable = true;
    address = await signer.getAddress();
  } else {
    provider = ethers.getDefaultProvider(); // Fallback view-only
  }
  return { provider, signer, isWritable, address };
}

// Modular Google Sheet Loader
async function showGoogleSheet(sheetUrl, containerId) {
  try{
    let docId = sheetUrl.split('/d/')[1]?.split('/')[0];
    if (!docId) return;
    let csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
    let resp = await fetch(csvUrl); let txt = await resp.text();
    let rows = txt.split('\n').map(r => r.split(','));
    let html = '<table border="1" style="font-size:small;">' +
      rows.map(r => `<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('') + '</table>';
    document.getElementById(containerId).innerHTML = '<b>Google Sheet:</b>' + html;
  }catch(e){ /* abaikan error sheet */ }
}

async function loadMetadata() {
  document.getElementById('infotxt').innerText = "Memuat metadata...";
  const res = await fetch(METADATA_URL); const data = await res.json();

  // Load NFT image
  document.getElementById('nftimg').src = ipfsUrl(data.image);
  document.getElementById('infotxt').innerText = data.name || "NFT Modular";

  // Google Sheet modular
  if (data.properties?.google_sheet_live)
    showGoogleSheet(data.properties.google_sheet_live, "sheetdata");

  // Modular HTML/JS
  if (data.properties?.custom_html) {
    const htm = await fetch(ipfsUrl(data.properties.custom_html)).then(x=>x.text());
    document.getElementById('dynamic-module').innerHTML = htm;
  }
  if (data.properties?.custom_js) {
    let s = document.createElement("script"); s.src = ipfsUrl(data.properties.custom_js);
    document.body.appendChild(s);
  }

  // Show chatbox if contract interaktif ada
  if (data.properties?.main_contract) document.getElementById("chatbox").style.display = "flex";

  await loadMessages();
}

async function loadMessages() {
  const {provider} = await getProviderAndSigner();
  if (!provider) return;
  try{
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const msgs = await contract.getMessages(TOKEN_ID);
    document.getElementById('messages').innerHTML = (msgs.length ? "<b>History Blockchain:</b><br/>":"") +
      msgs.map(x=> `<div>📝 ${x}</div>`).join('');
  }catch(e){
    document.getElementById('messages').innerText = "(Failed get on-chain messages)";
  }
}

async function addMessage() {
  const {signer, isWritable} = await getProviderAndSigner();
  if (!isWritable) return alert("Wallet tidak terkoneksi!");
  const input = document.getElementById('msginput'); const msg = input.value.trim();
  if (!msg) return;
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const tx = await contract.addMessage(TOKEN_ID, msg);
    document.getElementById('infotxt').innerText = "Transaksi dikonfirmasi...";
    await tx.wait();
    input.value=""; await loadMessages();
    document.getElementById('infotxt').innerText = "Terkirim!";
  } catch (e) {
    alert("Gagal mengirim: " + (e && e.message));
  }
}

window.addEventListener('DOMContentLoaded', loadMetadata);
