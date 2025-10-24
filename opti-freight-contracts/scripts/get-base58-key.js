const bs58 = require("bs58").default || require("bs58");
const fs = require("fs");

const keypairArray = JSON.parse(fs.readFileSync("/home/rocio/opti-f/mint-wallet.json", "utf-8"));
const base58Key = bs58.encode(Buffer.from(keypairArray));

console.log("Base58 Private Key:");
console.log(base58Key);
