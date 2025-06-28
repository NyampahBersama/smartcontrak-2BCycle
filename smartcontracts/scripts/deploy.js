// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const stakingTokenAddress = "0xcEcaab4eb1222244Ea0cF4428d700C282F0f3830"; // Base mainnet ERC20 Staking Token

  const ModularStakingDeFi = await hre.ethers.getContractFactory("ModularStakingDeFi");
  const contract = await ModularStakingDeFi.deploy(stakingTokenAddress);

  await contract.deployed();

  console.log("ModularStakingDeFi deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
