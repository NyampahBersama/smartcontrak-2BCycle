// Ganti ke address kontrak CCUSMarket yang valid!
const CONTRACT = "0xYourCCUSMarketAddress";         // <-- GANTI dgn alamat kontrakmu!
const ABI = [
  "function submit(uint8,uint256,string) external returns(uint256)",
  "function getTotals(address) external view returns(uint256,uint256,uint256)",
  "function bySubmitter(address) external view returns(uint256[])",
  "function entries(uint256) external view returns(address,uint8,uint256,string,uint8,address,uint256)"
];
const RPC = "https://mainnet.base.org"; // Base mainnet

async function submitEntry() {
  const notif = document.getElementById("notif");
  notif.innerText = "";
  const actType = parseInt(document.getElementById('actType').value,10);
  const amt = Number(document.getElementById('inputAmt').value);
  const cid = document.getElementById('inputCid').value.trim() || "-";

  if(!(window.ethereum)) {
    notif.innerText = "Wallet/Web3 tidak terdeteksi.";
    return;
  }
  if(!amt || amt<=0) {
    notif.innerText = "Jumlah wajib diisi positif.";
    return;
  }
  notif.innerText = "Memproses transaksi, cek wallet...";
  try {
    await window.ethereum.request({method:"eth_requestAccounts"});
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CONTRACT, ABI, signer);

    // PENTING: ganti parseUnits jika DECIMALS kontrak = 2 (atau 18 untuk wei/token)
    const tx = await contract.submit(actType, ethers.utils.parseUnits(String(amt), 2), cid);
    notif.innerText = "Tunggu konfirmasi transaksi...";
    await tx.wait();
    notif.innerText = "Berhasil didaftarkan! Tunggu approval verifikator.";
    loadMy();
    document.getElementById('inputAmt').value="";
    document.getElementById('inputCid').value="";
  } catch(e) {
    notif.innerText = "Submit gagal: " + (e && e.message ? e.message : e);
  }
}

async function loadMy() {
  const statsDiv = document.getElementById("stats");
  statsDiv.innerHTML = "...";
  let address = "";
  if(window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    address = (await provider.listAccounts())[0] || "";
  }
  if(!address) {
    statsDiv.innerText = "Wallet tidak terkoneksi.";
    return;
  }
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(CONTRACT, ABI, provider);
  try{
    const [captured, utilized, stored] = await contract.getTotals(address);
    statsDiv.innerHTML = `<ul>
    <li><b>Captured:</b> ${toNum(captured)} ton CO₂</li>
    <li><b>Utilized:</b> ${toNum(utilized)} ton CO₂</li>
    <li><b>Stored :</b> ${toNum(stored)} ton CO₂</li>
    <li><b>Total    :</b> <b>${toNum(captured+utilized+stored)} ton CO₂</b></li>
    </ul>`;
  }catch(e){statsDiv.innerText = "Gagal load stats.";}
}

async function loadLeaderboard() {
  const ldr = document.getElementById("ldrRows");
  ldr.innerHTML = "...";
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(CONTRACT, ABI, provider);

  // Kumpulkan 200 address; scan last 1000 entry (optimasi ke depannya)
  let addrs = {}, addrList = [], lastN = 1000;
  for(let i=0;i<lastN;i++){
    try{
      const entry = await contract.entries(i);
      if(!entry || !entry.submitter) break;
      if(!addrs[entry.submitter]) addrList.push(entry.submitter);
      addrs[entry.submitter]=true;
    }catch(e){break;}
    if(addrList.length>200) break;
  }
  let stats = [];
  for(let i=0;i<addrList.length;i++){
    try {
      const [captured,utilized,stored]= await contract.getTotals(addrList[i]);
      stats.push({
        address:addrList[i],
        captured:Number(captured),
        utilized:Number(utilized),
        stored:Number(stored),
        total:Number(captured)+Number(utilized)+Number(stored)
      });
    }catch(e){}
  }
  stats.sort((a,b)=>b.total-a.total);
  let top = stats.slice(0,10);

  ldr.innerHTML = top.map((u,ix)=>`<tr>
      <td>${ix+1}</td>
      <td><code style="font-size:95%;">${u.address.slice(0,7)}…${u.address.slice(-5)}</code></td>
      <td>${toNum(u.captured)}</td>
      <td>${toNum(u.utilized)}</td>
      <td>${toNum(u.stored)}</td>
      <td><b>${toNum(u.total)}</b></td>
    </tr>`).join('');
}

function toNum(x) {
  let n = (typeof x === "object" && x.toString) ? Number(x.toString()) : Number(x);
  return Math.round(n * 100)/100;
}

window.addEventListener('DOMContentLoaded',()=>{
  loadMy();
  loadLeaderboard();
});
