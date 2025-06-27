// ======= KONFIG ========
// Ubah ke metadata NFT, alamat kontrak
const metadataURL = "https://ipfs.io/ipfs/Qm...NFT-Metadata.json";
const contractAddress = "0x...SmartContractAddress";
const tokenId = 0; // Ubah sesuai NFT

// ABI ringkas hanya bagian addMessage & getMessages
const contractABI = [
  "function addMessage(uint256 tokenId, string calldata message) external",
  "function getMessages(uint256 tokenId) view external returns (string[] memory)"
];

// ========== LOAD METADATA & GAMBARNYA ==========
async function loadMetadata() {
  const res = await fetch(metadataURL);
  const metadata = await res.json();
  // Set NFT image
  document.getElementById('nftimg').src = metadata.image.replace("ipfs://",
    "https://ipfs.io/ipfs/");
  document.getElementById('info').innerHTML =
      `<small>Metadata loaded: ${metadata.name}</small>`;
  loadMessages();
}

async function loadMessages() {
  if (!window.ethereum) return;
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(contractAddress, contractABI, provider);
  const messages = await contract.getMessages(tokenId);
  document.getElementById('messages').innerHTML =
      messages.map(msg => `<div>📝 ${msg}</div>`).join('');
}

async function addMessage() {
  if (!window.ethereum) {
    alert("Metamask/web3 wallet belum terpasang.");
    return;
  }
  const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  const input = document.getElementById('msginput');
  const msg = input.value.trim();
  if (!msg) return;
  try {
    const tx = await contract.addMessage(tokenId, msg);
    await tx.wait();
    input.value = "";
    loadMessages();
  } catch (e) {
    alert("Gagal mengirim pesan: " + (e && e.message));
  }
}

window.addEventListener('load', loadMetadata);
