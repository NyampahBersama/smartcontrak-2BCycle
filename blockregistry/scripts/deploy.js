// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  // Customisasi nama-simbol SBT sesuai brandingmu
  const name = "Soulbound Membership";
  const symbol = "SBTM";

  const SoulboundNFT = await hre.ethers.getContractFactory("SoulboundNFT");
  const contract = await SoulboundNFT.deploy(name, symbol);

  await contract.deployed();

  console.log("SoulboundNFT deployed at:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
