// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  // === PARAMETER & KONFIGURASI ===
  const DAO_TOKEN_SUPPLY = hre.ethers.utils.parseEther("1000000"); // 1 juta token
  const GOVERNOR_NAME = "DAO Snapshot Governor";
  const VOTING_DELAY = 1; // blocks
  const VOTING_PERIOD = 45818; // blocks (~1 minggu di Ethereum)
  const PROPOSAL_THRESHOLD = hre.ethers.utils.parseEther("1"); // 1 token
  const QUORUM_PERCENTAGE = 4; // 4%
  const TIMELOCK_DELAY = 2 * 24 * 60 * 60; // 2 hari (detik)
  const CHAIN_DEPLOYER = (await hre.ethers.getSigners())[0].address;

  // 1. Deploy Voting Token (ERC20Votes)
  console.log("Deploying Voting Token...");
  const Token = await hre.ethers.getContractFactory("DAOToken");
  const token = await Token.deploy();
  await token.deployed();
  console.log("Voting Token:", token.address);

  // 2. Deploy Timelock
  // Proposer: nanti di-set jadi address Governor
  // Executor: (0x0...0) artinya semua orang bisa eksekusi
  console.log("Deploying Timelock...");
  const proposers = [];
  const executors = ["0x0000000000000000000000000000000000000000"];
  const Timelock = await hre.ethers.getContractFactory("DAOTimelock");
  const timelock = await Timelock.deploy(TIMELOCK_DELAY, proposers, executors);
  await timelock.deployed();
  console.log("Timelock:", timelock.address);

  // 3. Deploy Governor
  console.log("Deploying Governor...");
  const Governor = await hre.ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.deploy(
    token.address,
    timelock.address
  );
  await governor.deployed();
  console.log("Governor:", governor.address);

  // 4. Setup Proposer Role timelock (block unauthorized proposal)
  // Grant proposer role to Governor contract
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();

  const grantProposerTx = await timelock.grantRole(proposerRole, governor.address);
  await grantProposerTx.wait();
  console.log("Timelock proposerRole => Governor set.");

  // 5. Setup Timelock admin governance: revoke deployer admin for timelock (optional, for full DAO)
  const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();
  if (await timelock.hasRole(adminRole, CHAIN_DEPLOYER)) {
    const revokeTx = await timelock.revokeRole(adminRole, CHAIN_DEPLOYER);
    await revokeTx.wait();
    console.log("Timelock adminRole => removed from deployer");
  }

  // 6. Mint voting token to deployer (if not minted in constructor)
  // Uncomment if voting token has manual mint function
  // await token.mint(CHAIN_DEPLOYER, DAO_TOKEN_SUPPLY);

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Voting Token:", token.address);
  console.log("Timelock   :", timelock.address);
  console.log("Governor   :", governor.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
