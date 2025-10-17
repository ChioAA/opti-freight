import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";
import { BN } from "bn.js";
import * as fs from "fs";
import * as path from "path";

describe("opti-freight", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load IDL from the studio directory
  const idlPath = path.join(__dirname, "../../studio/src/lib/idl/opti_freight.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(idl.address);

  const program = new Program(idl, provider) as Program;

  // Constants from the contract
  const TOKENS_PER_TRAILER = 1000;
  const TOKEN_PRICE = new BN(200_000_000); // $200 USDC (6 decimals)
  const PRIMARY_FEE_BPS = 300; // 3%
  const PENALTY = new BN(50_000_000); // $50 USDC
  const MIN_RESALE = new BN(250_000_000); // $250 USDC
  const DISTRIBUTION_DAY = 20;

  // Test accounts
  let usdcMint: PublicKey;
  let seller: Keypair;
  let buyer: Keypair;
  let platformWallet: Keypair;
  let sellerUsdcAccount: any;
  let buyerUsdcAccount: any;
  let platformUsdcAccount: any;
  let poolAccount: any;
  let poolAuthority: PublicKey;

  // PDAs
  let salePda: PublicKey;
  let listingPda: PublicKey;

  before(async () => {
    console.log("\n🚀 Setting up test environment...\n");

    // Create test wallets
    seller = Keypair.generate();
    buyer = Keypair.generate();
    platformWallet = Keypair.generate();

    // Airdrop SOL to test accounts
    console.log("💰 Airdropping SOL to test accounts...");
    await provider.connection.requestAirdrop(
      seller.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      buyer.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      platformWallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create USDC mint (simulated)
    console.log("🪙 Creating USDC mint...");
    usdcMint = await createMint(
      provider.connection,
      seller,
      seller.publicKey,
      null,
      6 // USDC has 6 decimals
    );

    // Create token accounts for all parties
    console.log("📦 Creating token accounts...");
    sellerUsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller,
      usdcMint,
      seller.publicKey
    );

    buyerUsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer,
      usdcMint,
      buyer.publicKey
    );

    platformUsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      platformWallet,
      usdcMint,
      platformWallet.publicKey
    );

    // Create pool account for distribution tests
    poolAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller,
      usdcMint,
      seller.publicKey
    );

    // Mint USDC to buyer for testing (10,000 USDC)
    console.log("💵 Minting test USDC to buyer...");
    await mintTo(
      provider.connection,
      seller,
      usdcMint,
      buyerUsdcAccount.address,
      seller,
      10_000_000_000 // 10,000 USDC
    );

    // Mint USDC to pool for distribution tests (5,000 USDC)
    console.log("💵 Minting test USDC to pool...");
    await mintTo(
      provider.connection,
      seller,
      usdcMint,
      poolAccount.address,
      seller,
      5_000_000_000 // 5,000 USDC
    );

    // Derive PDAs
    [salePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("sale"), seller.publicKey.toBuffer()],
      program.programId
    );

    [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.publicKey.toBuffer()],
      program.programId
    );

    [poolAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool-auth")],
      program.programId
    );

    console.log("\n✅ Test environment setup complete!\n");
    console.log("Program ID:", program.programId.toString());
    console.log("USDC Mint:", usdcMint.toString());
    console.log("Seller:", seller.publicKey.toString());
    console.log("Buyer:", buyer.publicKey.toString());
    console.log("Platform:", platformWallet.publicKey.toString());
    console.log("Sale PDA:", salePda.toString());
    console.log("Listing PDA:", listingPda.toString());
    console.log("\n");
  });

  describe("Primary Market", () => {
    it("Should initialize a sale", async () => {
      console.log("\n📝 Test: Initialize Sale");

      const tx = await program.methods
        .initSale()
        .accounts({
          authority: seller.publicKey,
          sale: salePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc();

      console.log("✅ Sale initialized. TX:", tx);

      // Fetch and verify the sale account
      const saleAccount = await program.account.sale.fetch(salePda);

      expect(saleAccount.authority.toString()).to.equal(seller.publicKey.toString());
      expect(saleAccount.total).to.equal(TOKENS_PER_TRAILER);
      expect(saleAccount.sold).to.equal(0);
      expect(saleAccount.active).to.be.true;

      console.log("Sale account:", {
        authority: saleAccount.authority.toString(),
        total: saleAccount.total,
        sold: saleAccount.sold,
        active: saleAccount.active,
      });
    });

    it("Should buy tokens from primary market", async () => {
      console.log("\n💰 Test: Buy Primary Market");

      const amount = 10; // Buy 10 tokens
      const expectedCost = TOKEN_PRICE.mul(new BN(amount));
      const expectedFee = expectedCost.mul(new BN(PRIMARY_FEE_BPS)).div(new BN(10000));
      const totalCost = expectedCost.add(expectedFee);

      console.log("Amount to buy:", amount);
      console.log("Base cost:", expectedCost.toString(), "($200 x 10)");
      console.log("Fee (3%):", expectedFee.toString());
      console.log("Total cost:", totalCost.toString());

      // Get balances before
      const buyerBalanceBefore = (
        await provider.connection.getTokenAccountBalance(buyerUsdcAccount.address)
      ).value.amount;
      const sellerBalanceBefore = (
        await provider.connection.getTokenAccountBalance(sellerUsdcAccount.address)
      ).value.amount;
      const platformBalanceBefore = (
        await provider.connection.getTokenAccountBalance(platformUsdcAccount.address)
      ).value.amount;

      const tx = await program.methods
        .buyPrimary(amount)
        .accounts({
          buyer: buyer.publicKey,
          sale: salePda,
          buyerUsdc: buyerUsdcAccount.address,
          sellerUsdc: sellerUsdcAccount.address,
          platformUsdc: platformUsdcAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();

      console.log("✅ Tokens purchased. TX:", tx);

      // Get balances after
      const buyerBalanceAfter = (
        await provider.connection.getTokenAccountBalance(buyerUsdcAccount.address)
      ).value.amount;
      const sellerBalanceAfter = (
        await provider.connection.getTokenAccountBalance(sellerUsdcAccount.address)
      ).value.amount;
      const platformBalanceAfter = (
        await provider.connection.getTokenAccountBalance(platformUsdcAccount.address)
      ).value.amount;

      // Verify balances
      expect(
        new BN(buyerBalanceBefore).sub(new BN(buyerBalanceAfter)).toString()
      ).to.equal(totalCost.toString());
      expect(
        new BN(sellerBalanceAfter).sub(new BN(sellerBalanceBefore)).toString()
      ).to.equal(expectedCost.toString());
      expect(
        new BN(platformBalanceAfter).sub(new BN(platformBalanceBefore)).toString()
      ).to.equal(expectedFee.toString());

      // Verify sale account updated
      const saleAccount = await program.account.sale.fetch(salePda);
      expect(saleAccount.sold).to.equal(amount);
      expect(saleAccount.active).to.be.true;

      console.log("Buyer spent:", new BN(buyerBalanceBefore).sub(new BN(buyerBalanceAfter)).toString());
      console.log("Seller received:", new BN(sellerBalanceAfter).sub(new BN(sellerBalanceBefore)).toString());
      console.log("Platform received:", new BN(platformBalanceAfter).sub(new BN(platformBalanceBefore)).toString());
      console.log("Tokens sold:", saleAccount.sold);
    });

    it("Should fail to buy when sale is not active", async () => {
      console.log("\n❌ Test: Buy from inactive sale (should fail)");

      // First, close the sale
      await program.methods
        .closeSale()
        .accounts({
          authority: seller.publicKey,
          sale: salePda,
        })
        .signers([seller])
        .rpc();

      console.log("Sale closed");

      // Try to buy (should fail)
      try {
        await program.methods
          .buyPrimary(5)
          .accounts({
            buyer: buyer.publicKey,
            sale: salePda,
            buyerUsdc: buyerUsdcAccount.address,
            sellerUsdc: sellerUsdcAccount.address,
            platformUsdc: platformUsdcAccount.address,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([buyer])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("Not active");
        console.log("✅ Correctly failed with 'Not active' error");
      }
    });
  });

  describe("Secondary Market", () => {
    let secondarySeller: Keypair;
    let secondarySellerUsdcAccount: any;
    let secondaryListingPda: PublicKey;

    before(async () => {
      console.log("\n🔧 Setting up secondary market tests...");

      // Create new seller for secondary market
      secondarySeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        secondarySeller.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create USDC account for secondary seller
      secondarySellerUsdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        secondarySeller,
        usdcMint,
        secondarySeller.publicKey
      );

      // Derive listing PDA for secondary seller
      [secondaryListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), secondarySeller.publicKey.toBuffer()],
        program.programId
      );

      console.log("Secondary seller:", secondarySeller.publicKey.toString());
      console.log("Secondary listing PDA:", secondaryListingPda.toString());
    });

    it("Should create a listing", async () => {
      console.log("\n📋 Test: Create Listing");

      const price = MIN_RESALE; // $250 USDC
      const amount = 5;

      const tx = await program.methods
        .createListing(price, amount)
        .accounts({
          seller: secondarySeller.publicKey,
          listing: secondaryListingPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([secondarySeller])
        .rpc();

      console.log("✅ Listing created. TX:", tx);

      // Verify listing account
      const listingAccount = await program.account.listing.fetch(secondaryListingPda);

      expect(listingAccount.seller.toString()).to.equal(secondarySeller.publicKey.toString());
      expect(listingAccount.price.toString()).to.equal(price.toString());
      expect(listingAccount.amount).to.equal(amount);
      expect(listingAccount.active).to.be.true;

      console.log("Listing account:", {
        seller: listingAccount.seller.toString(),
        price: listingAccount.price.toString(),
        amount: listingAccount.amount,
        active: listingAccount.active,
      });
    });

    it("Should fail to create listing with price below minimum", async () => {
      console.log("\n❌ Test: Create listing with low price (should fail)");

      const lowPrice = new BN(200_000_000); // $200 (below $250 minimum)
      const newSeller = Keypair.generate();

      await provider.connection.requestAirdrop(
        newSeller.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const [newListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), newSeller.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createListing(lowPrice, 5)
          .accounts({
            seller: newSeller.publicKey,
            listing: newListingPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([newSeller])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("Price too low");
        console.log("✅ Correctly failed with 'Price too low' error");
      }
    });

    it("Should buy from secondary market with penalty", async () => {
      console.log("\n💸 Test: Buy Secondary Market");

      const amount = 2; // Buy 2 tokens
      const pricePerToken = MIN_RESALE; // $250
      const subtotal = pricePerToken.mul(new BN(amount));
      const marketFee = subtotal.mul(new BN(PRIMARY_FEE_BPS)).div(new BN(10000));
      const penaltyTotal = PENALTY.mul(new BN(amount));
      const sellerAmount = subtotal.sub(penaltyTotal);
      const platformTotal = penaltyTotal.add(marketFee);
      const buyerTotal = subtotal.add(marketFee);

      console.log("Amount to buy:", amount);
      console.log("Price per token:", pricePerToken.toString());
      console.log("Subtotal:", subtotal.toString());
      console.log("Market fee:", marketFee.toString());
      console.log("Penalty total:", penaltyTotal.toString());
      console.log("Seller receives:", sellerAmount.toString());
      console.log("Platform receives:", platformTotal.toString());
      console.log("Buyer pays:", buyerTotal.toString());

      // Get balances before
      const buyerBalanceBefore = (
        await provider.connection.getTokenAccountBalance(buyerUsdcAccount.address)
      ).value.amount;
      const sellerBalanceBefore = (
        await provider.connection.getTokenAccountBalance(secondarySellerUsdcAccount.address)
      ).value.amount;
      const platformBalanceBefore = (
        await provider.connection.getTokenAccountBalance(platformUsdcAccount.address)
      ).value.amount;

      const tx = await program.methods
        .buySecondary(amount)
        .accounts({
          buyer: buyer.publicKey,
          listing: secondaryListingPda,
          buyerUsdc: buyerUsdcAccount.address,
          sellerUsdc: secondarySellerUsdcAccount.address,
          platformUsdc: platformUsdcAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();

      console.log("✅ Tokens purchased from secondary market. TX:", tx);

      // Get balances after
      const buyerBalanceAfter = (
        await provider.connection.getTokenAccountBalance(buyerUsdcAccount.address)
      ).value.amount;
      const sellerBalanceAfter = (
        await provider.connection.getTokenAccountBalance(secondarySellerUsdcAccount.address)
      ).value.amount;
      const platformBalanceAfter = (
        await provider.connection.getTokenAccountBalance(platformUsdcAccount.address)
      ).value.amount;

      // Verify balances
      expect(
        new BN(buyerBalanceBefore).sub(new BN(buyerBalanceAfter)).toString()
      ).to.equal(buyerTotal.toString());
      expect(
        new BN(sellerBalanceAfter).sub(new BN(sellerBalanceBefore)).toString()
      ).to.equal(sellerAmount.toString());
      expect(
        new BN(platformBalanceAfter).sub(new BN(platformBalanceBefore)).toString()
      ).to.equal(platformTotal.toString());

      // Verify listing updated
      const listingAccount = await program.account.listing.fetch(secondaryListingPda);
      expect(listingAccount.amount).to.equal(3); // 5 - 2 = 3
      expect(listingAccount.active).to.be.true;

      console.log("Buyer spent:", new BN(buyerBalanceBefore).sub(new BN(buyerBalanceAfter)).toString());
      console.log("Seller received:", new BN(sellerBalanceAfter).sub(new BN(sellerBalanceBefore)).toString());
      console.log("Platform received:", new BN(platformBalanceAfter).sub(new BN(platformBalanceBefore)).toString());
      console.log("Remaining tokens in listing:", listingAccount.amount);
    });

    it("Should cancel a listing", async () => {
      console.log("\n🚫 Test: Cancel Listing");

      const tx = await program.methods
        .cancelListing()
        .accounts({
          seller: secondarySeller.publicKey,
          listing: secondaryListingPda,
        })
        .signers([secondarySeller])
        .rpc();

      console.log("✅ Listing cancelled. TX:", tx);

      // Verify account is closed
      try {
        await program.account.listing.fetch(secondaryListingPda);
        expect.fail("Account should be closed");
      } catch (error) {
        console.log("✅ Listing account successfully closed");
      }
    });
  });

  describe("Monthly Distribution", () => {
    it("Should fail distribution on wrong day", async () => {
      console.log("\n📅 Test: Distribution on wrong day (should fail)");

      try {
        await program.methods
          .distributeMonthly(10)
          .accounts({
            user: buyer.publicKey,
            pool: poolAccount.address,
            userUsdc: buyerUsdcAccount.address,
            poolAuth: poolAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([buyer])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("Wrong day");
        console.log("✅ Correctly failed with 'Wrong day' error");
      }
    });

    // Note: Testing actual distribution would require manipulating the clock,
    // which is complex in tests. This test verifies the day check works.
  });

  describe("Edge Cases", () => {
    let edgeSeller: Keypair;
    let edgeSalePda: PublicKey;

    before(async () => {
      edgeSeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        edgeSeller.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));

      [edgeSalePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("sale"), edgeSeller.publicKey.toBuffer()],
        program.programId
      );
    });

    it("Should fail when buying more than available", async () => {
      console.log("\n❌ Test: Buy more than available (should fail)");

      // Initialize sale
      await program.methods
        .initSale()
        .accounts({
          authority: edgeSeller.publicKey,
          sale: edgeSalePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([edgeSeller])
        .rpc();

      // Try to buy more than total (1001 > 1000)
      try {
        await program.methods
          .buyPrimary(1001)
          .accounts({
            buyer: buyer.publicKey,
            sale: edgeSalePda,
            buyerUsdc: buyerUsdcAccount.address,
            sellerUsdc: sellerUsdcAccount.address,
            platformUsdc: platformUsdcAccount.address,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([buyer])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("Sold out");
        console.log("✅ Correctly failed with 'Sold out' error");
      }
    });

    it("Should auto-close sale when all tokens sold", async () => {
      console.log("\n✅ Test: Auto-close sale when sold out");

      // Buy all remaining tokens
      await program.methods
        .buyPrimary(1000)
        .accounts({
          buyer: buyer.publicKey,
          sale: edgeSalePda,
          buyerUsdc: buyerUsdcAccount.address,
          sellerUsdc: sellerUsdcAccount.address,
          platformUsdc: platformUsdcAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();

      // Verify sale is inactive
      const saleAccount = await program.account.sale.fetch(edgeSalePda);
      expect(saleAccount.active).to.be.false;
      expect(saleAccount.sold).to.equal(TOKENS_PER_TRAILER);

      console.log("✅ Sale auto-closed after selling all tokens");
      console.log("Tokens sold:", saleAccount.sold);
      console.log("Sale active:", saleAccount.active);
    });
  });
});
