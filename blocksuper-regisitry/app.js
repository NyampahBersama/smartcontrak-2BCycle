// Ganti dengan address kontrak OmniGateway-mu:
const OMNI_ADDR = "0xYourOmniGatewayAddress";
const OMNI_ABI = [
  // Fungsi universal join: join(bytes32 idHash, string memory context)
  "function join(bytes32 idHash, string calldata context) public",
  "event Joined(address indexed user, bytes32 indexed idHash, string context, uint256 timestamp)"
];
const RPC_URL = "https://mainnet.base.org"; // RPC endpoint Base (mainnet/testnet)

document.addEventListener('DOMContentLoaded', () => {
  // Opsional: klik otomatis jika sudah connect wallet
  document.getElementById("btnJoin").disabled = false;
  document.getElementById("status").innerText = "";
});

// Hash (web2/email/user input → keccak256)
function getIdHash() {
  let val = document.getElementById("ident").value.trim();
  if(val=="") return "0x" + "0".repeat(64); // Kosong = universal, bisa diisi backend
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(val));
}

async function joinGateway() {
  document.getElementById("errMsg").innerText = "";
  document.getElementById("status").innerText = "Memproses gabung...";
  document.getElementById("btnJoin").disabled = true;
  let idHash = getIdHash();
  let context = "web-"+(navigator.userAgent||"").substr(0,40);

  // Cek wallet
  let eth = window.ethereum;
  if(!eth) {
    document.getElementById("errMsg").innerText = "Metamask/web3 wallet tidak tersedia. Install dulu!";
    document.getElementById("btnJoin").disabled = false;
    return;
  }
  try {
    await eth.request({method:"eth_requestAccounts"}); // connect wallet
    const provider = new ethers.providers.Web3Provider(eth);
    const signer = provider.getSigner();
    const addr = await signer.getAddress();
    const omni = new ethers.Contract(OMNI_ADDR, OMNI_ABI, signer);

    // Kirim transaksi join
    let tx = await omni.join(idHash, context);
    document.getElementById("status").innerText = "Menunggu transaksi...";
    await tx.wait();

    document.getElementById("status").innerHTML = `<b>Selamat!</b> Kamu berhasil gabung.<br>Address: <code>${addr}</code>`;
    document.getElementById("btnJoin").style.display = "none";
  } catch(e) {
    document.getElementById("errMsg").innerText = "Join gagal: "+(e && e.message ? e.message : e);
    document.getElementById("btnJoin").disabled = false;
  }
}
