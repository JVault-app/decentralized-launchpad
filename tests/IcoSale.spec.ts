import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransactions, printTransactionFees } from '@ton-community/sandbox';
import { Address, Cell, CommonMessageInfoInternal, Dictionary, beginCell, comment, toNano } from 'ton-core';
import { RefWallet } from '../wrappers/RefWallet';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { IcoSale, IcoSaleConfig, PurchaseConditionsRoot, RefsDictValue } from '../wrappers/IcoSale';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMinter } from '../wrappers/JettonMinter';
import { SbtSingle } from '../wrappers/SbtSingle';
import { randomAddress } from '@ton-community/test-utils';
import { ErrorCodes, OpCodes, PERCENT_DEVIDER } from '../wrappers/helpers/constants';
import { SbtNft } from '../wrappers/SftItem';

describe('Ico', () => {
    let icoSaleCode: Cell;
    let refWalletCode: Cell
    let sbtCode: Cell
    let sbtSingleCode: Cell
    let jettonRootCode: Cell
    let jettonWalletCode: Cell

    let jettonWalletAddress: SandboxContract<JettonWallet>
    let user1JettonWallet: SandboxContract<JettonWallet>
    let admin: SandboxContract<TreasuryContract>;
    let owner: SandboxContract<TreasuryContract>;
    let jettonRoot: SandboxContract<JettonMinter>;
    let nativeVault: SandboxContract<TreasuryContract>;
    let jettonVault: SandboxContract<TreasuryContract>;
    let wlCollection: SandboxContract<TreasuryContract>;
    let wlSbt: SandboxContract<SbtSingle>
    let ref: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;

    let ico: SandboxContract<IcoSale>
    const nowSetting = 2000000000

    beforeAll(async () => {
        icoSaleCode = await compile('IcoSale')
        refWalletCode = await compile('RefWallet');
        sbtCode = await compile('SftItem')
        jettonRootCode = await compile('JettonMinter')
        jettonWalletCode = await compile('JettonWallet')
        sbtSingleCode = await compile('SbtSingle')
    });

    let blockchain: Blockchain;
    let conf: IcoSaleConfig

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = nowSetting

        wlCollection = await blockchain.treasury("WlCollection")
        admin = await blockchain.treasury("admin")
        owner = await blockchain.treasury("owner")
        user1 = await blockchain.treasury("user1")
        user2 = await blockchain.treasury("user2")
        ref = await blockchain.treasury("ref")

        nativeVault = await blockchain.treasury("native vault")
        jettonVault = await blockchain.treasury("jetton vault")
        await nativeVault.send({to: nativeVault.address, value: toNano(1)})
        await jettonVault.send({to: jettonVault.address, value: toNano(1)})
        
        jettonRoot = blockchain.openContract(JettonMinter.createFromConfig({admin: admin.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonRootCode))
        await jettonRoot.sendMint(admin.getSender(), user1.address, toNano(999999999999), toNano("0.2"), toNano("0.5"))
        user1JettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonRoot.getWalletAddress(user1.address)))

        wlSbt = blockchain.openContract(SbtSingle.createFromConfig({collection_address: wlCollection.address, index: 0n}, sbtSingleCode))
        const wlres = await wlSbt.sendDeploy(wlCollection.getSender(), toNano("0.1"), {owner: user2.address, content: Cell.EMPTY})
        // console.log(wlres.transactions)
        expect((await wlSbt.getData()).init).toBeTruthy()

        let purchaseConditions = {
            priceFactor: 2n,
            priceDevider: 1n,
            minPurchaseTon: toNano(10),
            maxPurchaseTon: toNano(100),
                wlCondition1: {
                    priceFactor: 15n,
                    priceDevider: 10n,
                    minPurchaseTon: toNano(10),
                    maxPurchaseTon: toNano(30000), wlSbtCode: sbtSingleCode, 
                    wlCollectionAddress: wlCollection.address
                }
        }
        let commission_factors: Dictionary<bigint, number> = Dictionary.empty()
        let refsDict: Dictionary<Address, RefsDictValue> = Dictionary.empty()
        refsDict = refsDict.set(ref.address, {cashbackFactor: 20, discountFactor: 100})
        commission_factors = commission_factors.set(toNano(0), 1000000)

        conf = {
            saleStartTime: nowSetting + 1000,
            saleEndTime: nowSetting + 10000,

            minTonCollected: toNano(20000),
            allocatedJettons: toNano(100000),
            liquidityPartTon: 80000000,
            liquidityPartJetton: 40000000,

            firstUnlockTime: nowSetting + 12000,
            firstUnlockSize: (PERCENT_DEVIDER / 10n),  // first unlock = 10%
            cycleLength: 3600,
            cyclesNumber: 10,  // next unlocks = 9%

            adminAddress: admin.address,
            ownerAddress: owner.address,
            content: Cell.EMPTY,
            sftItemCode: sbtCode,

            jettonRootAddress: jettonRoot.address,
            nativeVaultAddress: nativeVault.address,
            jettonVaultAddress: jettonVault.address,
            purchaseConditions,
            commission_factors,

            minRefPurchase: toNano(20),
            defaultCashback: 1000000n,
            refsDict,
            refWalletCode: refWalletCode,
            changeInvitee: false,
            returnJettons: false,
        }

        ico = blockchain.openContract(IcoSale.createFromConfig(conf, icoSaleCode))
        jettonWalletAddress =blockchain.openContract(JettonWallet.createFromAddress(await jettonRoot.getWalletAddress(ico.address)))
        await ico.sendDeploy(admin.getSender(), toNano("1.055"))
    });

    it('should deploy', async () => {
        const data = await ico.getStorageData()
        expect(data.jetton_wallet_address).toEqualAddress(await jettonRoot.getWalletAddress(ico.address))
        expect(data.init).toBeTruthy()
    });
    it('should receive tokens', async () => {
        expect((await ico.getStorageData()).jettons_added).toBeFalsy()
        let res = await user1JettonWallet.sendTransfer(user1.getSender(), toNano("0.15"), toNano(20), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(0n)
        expect((await ico.getStorageData()).jettons_added).toBeFalsy()
        res = await user1JettonWallet.sendTransfer(user1.getSender(), toNano("0.15"), toNano(40000), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(0n)
        expect((await ico.getStorageData()).jettons_added).toBeFalsy()
        
        let fakeJettonRootAddress = blockchain.openContract(JettonMinter.createFromConfig({admin: user1.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonRootCode))
        await fakeJettonRootAddress.sendMint(user1.getSender(), user1.address, toNano(999999999999), toNano("0.2"), toNano("0.5"))
        let fakeUser1Wallet = blockchain.openContract(JettonWallet.createFromAddress(await fakeJettonRootAddress.getWalletAddress(user1.address)))
        let fakeIcoWallet = blockchain.openContract(JettonWallet.createFromAddress(await fakeJettonRootAddress.getWalletAddress(ico.address)))

        res = await fakeUser1Wallet.sendTransfer(user1.getSender(), toNano("0.15"), toNano(100000), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await fakeIcoWallet.getJettonBalance()).toEqual(toNano(0))
        expect((await ico.getStorageData()).jettons_added).toBeFalsy()

        res = await user1JettonWallet.sendTransfer(user1.getSender(), toNano("0.15"), toNano(100000), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(100000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()
        res = await user1JettonWallet.sendTransfer(user1.getSender(), toNano("0.15"), toNano(100000), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(100000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()
    });
    it('should sale without wl and ref', async () => {        
        // send jettons
        let res = await user1JettonWallet.sendTransfer(user1.getSender(), toNano("0.15"), toNano(100000), ico.address, user1.address, null, toNano("0.1"), null)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(100000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()

        let user1Claim = blockchain.openContract(SbtNft.createFromAddress(await ico.getWalletAddress(user1.address)))
        let user1Ref = blockchain.openContract(RefWallet.createFromAddress(await ico.getRefAddress(user1.address)))

        let user2ClaimWl = blockchain.openContract(SbtNft.createFromAddress(await ico.getWalletAddress(wlSbt.address)))
        let user2Ref = blockchain.openContract(RefWallet.createFromAddress(await ico.getRefAddress(user2.address)))

        // sale fails (not started)
        res = await ico.sendSimpleBuy(user1.getSender(), toNano(50))
        // printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.saleNotStarted
        })
        blockchain.now = conf.saleStartTime + 1

        // sale fails (less than min amount)
        res = await ico.sendSimpleBuy(user1.getSender(), toNano(10))
        // printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.lessThanMinPurchase
        })

        // sale fails (more than max amount)
        res = await ico.sendSimpleBuy(user1.getSender(), toNano(102))
        // printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.moreThanMaxPurchase
        })

        // sale confirms (sft created, ref wallet isn't called, ico sends excess)
        res = await ico.sendSimpleBuy(user1.getSender(), toNano("10.15"))
        // printTransactionFees(res.transactions)
        // console.log(res.events)
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Claim.address,
            op: OpCodes.UPDATE_SBT_DATA,
            deploy: true
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Claim.address,
            to: user1.address,
            op: OpCodes.TRANSFER_NOTIFICATION
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Claim.address,
            to: ico.address,
            op: OpCodes.APPROVE_PURCHASE
        })
        expect(res.transactions).not.toHaveTransaction({
            from: ico.address,
            to: user1Ref.address
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1.address,
            op: OpCodes.EXCESSES
        })
        expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(10))

        // sale confirms (ref wallet created)
        res = await ico.sendSimpleBuy(user1.getSender(), toNano("50.15"))
        // printTransactionFees(res.transactions)
        // console.log(await user1Claim.getStorageData())
        expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(60))
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Claim.address,
            op: OpCodes.UPDATE_SBT_DATA,
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Claim.address,
            to: user1.address,
            op: OpCodes.TRANSFER_NOTIFICATION
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Claim.address,
            to: ico.address,
            op: OpCodes.APPROVE_PURCHASE
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Ref.address,
            deploy: true
        })

        // sale confirms (ref wallet isn't called, ico sends excess)
        res = await ico.sendSimpleBuy(user1.getSender(), toNano("10.15"))
        // printTransactionFees(res.transactions)
        expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(70))
        expect((await user1Claim.getStorageData()).purchased_jettons).toEqual(toNano(70) * conf.purchaseConditions.priceDevider / conf.purchaseConditions.priceFactor)

        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            op: OpCodes.UPDATE_SBT_DATA
        })
        expect(res.transactions).toHaveTransaction({
            to: user1.address,
            op: OpCodes.TRANSFER_NOTIFICATION
        })
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            op: OpCodes.APPROVE_PURCHASE
        })
        expect(res.transactions).not.toHaveTransaction({
            from: ico.address,
            to: user1Ref.address
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1.address,
            op: OpCodes.EXCESSES
        })

        // sbt sale confirms (ref wallet sends excess, ico sends excess)
        res = await ico.sendSimpleBuy(user1.getSender(), toNano("30.15"))
        // printTransactionFees(res.transactions)

        expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(100))

        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            op: OpCodes.UPDATE_SBT_DATA
        })
        expect(res.transactions).toHaveTransaction({
            to: user1.address,
            op: OpCodes.TRANSFER_NOTIFICATION
        })
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            op: OpCodes.APPROVE_PURCHASE
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Ref.address
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1.address,
            op: OpCodes.EXCESSES
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Ref.address,
            to: user1.address,
            op: OpCodes.EXCESSES
        })

        res = await ico.sendSimpleBuy(user1.getSender(), toNano("10.15"))
        // printTransactionFees(res.transactions)

        expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(100))
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Claim.address,
            op: OpCodes.UPDATE_SBT_DATA
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Claim.address,
            to: ico.address,
            op: OpCodes.CANCEL_PURCHASE
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1.address,
            op: 0,
            body: comment("Unsuccessful purchase")
        })

        res = await user1Claim.sendClaim(user1.getSender(), toNano("0.1"))
        expect(res.transactions).toHaveTransaction({
            op: OpCodes.CLAIM,
            exitCode: ErrorCodes.notUnlockedYet
        })

        res = await wlSbt.sendBuyWl(user2.getSender(), toNano("30000.15"), {dest: ico.address, lvl: 0})
        // printTransactionFees(res.transactions)

        expect((await user2ClaimWl.getStorageData()).collected_ton).toBeGreaterThan(toNano(29999))
        expect((await user2ClaimWl.getStorageData()).collected_ton).toBeLessThanOrEqual(toNano(30000))
        expect((await user2ClaimWl.getStorageData()).purchased_jettons).toBeGreaterThan(toNano(29999) * conf.purchaseConditions.wlCondition1!!.priceDevider / conf.purchaseConditions.wlCondition1!!.priceFactor)
        expect((await user2ClaimWl.getStorageData()).purchased_jettons).toBeLessThanOrEqual(toNano(30000) * conf.purchaseConditions.wlCondition1!!.priceDevider / conf.purchaseConditions.wlCondition1!!.priceFactor)

        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user2ClaimWl.address,
            op: OpCodes.UPDATE_SBT_DATA,
            deploy: true
        })
        expect(res.transactions).toHaveTransaction({
            from: user2ClaimWl.address,
            to: user2.address,
            op: OpCodes.TRANSFER_NOTIFICATION
        })
        expect(res.transactions).toHaveTransaction({
            from: user2ClaimWl.address,
            to: ico.address,
            op: OpCodes.APPROVE_PURCHASE
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user2Ref.address,
            deploy: true
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user2.address,
            op: OpCodes.EXCESSES
        })
        // printTransactionFees(res.transactions)
        // console.log(res.events)
        // console.log(res.transactions[2].vmLogs)

        blockchain.now = conf.saleEndTime + 1
        res = await ico.sendEndSell(user1.getSender(), toNano(1))
        // printTransactionFees(res.transactions)
        // console.log(res.events)
        expect(res.transactions).toHaveTransaction({
            to: jettonVault.address,
            op: OpCodes.TRANSFER_NOTIFICATION
        })

        expect((await ico.getStorageData()).ton_collected).toBeGreaterThanOrEqual((await ico.getStorageData()).min_ton_collected)

        res = await user1Claim.sendRequestRefund(user1.getSender(), toNano("0.1"))
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.saleSucceed
        })
        await user1JettonWallet.sendBurn(user1.getSender(), toNano(1), await user1JettonWallet.getJettonBalance(), user1.address, Cell.EMPTY)
        expect(await user1JettonWallet.getJettonBalance()).toEqual(0n)

        res = await user1Claim.sendClaim(user1.getSender(), toNano("0.1"))
        expect(res.transactions).toHaveTransaction({
            to: user1Claim.address,
            op: OpCodes.CLAIM,
            exitCode: ErrorCodes.notUnlockedYet
        })

        blockchain.now = conf.firstUnlockTime + 1

        const firstUnlockPart = Number(conf.firstUnlockSize) / Number(PERCENT_DEVIDER);
        const vestingUnlockPart = (1 - firstUnlockPart) / conf.cyclesNumber;
        let purchasedAmount = Number((await user1Claim.getStorageData()).purchased_jettons);
        // console.log(purchasedAmount);
        let total_claimed_amount = "0";
        for (let i = 0; i <= conf.cyclesNumber; ++i) {
            res = await user1Claim.sendClaim(user1.getSender(), toNano("0.1"));
            // printTransactionFees(res.transactions);
            total_claimed_amount = Number(await user1JettonWallet.getJettonBalance()).toFixed(0);
            let expected_amount = (Number(purchasedAmount) * (firstUnlockPart + vestingUnlockPart * i)).toFixed(0);
            // console.log(total_claimed_amount);
            // console.log(expected_amount);
            expect(total_claimed_amount).toEqual(expected_amount);
            blockchain.now += conf.cycleLength;
        }
        expect(total_claimed_amount).toEqual(purchasedAmount.toFixed(0));
    })
    it ('should deploy refs', async () => {
        let new_refs: Dictionary<Address, RefsDictValue> = Dictionary.empty();
        for (let i = 0; i < 200; i++) {
            new_refs.set(randomAddress(), {cashbackFactor: 20, discountFactor: 100});
        }
        let res = await ico.sendAddRefAddresses(admin.getSender(), toNano(1), {refs: new_refs}) 
        // res = await ico.sendDeployRefs(user1.getSender(), toNano(1))
        let result_refs = (await ico.getStorageData()).refs_dict!!;
        expect(result_refs.size).toEqual(201);
        let cur_addr = null
        let temp_keys = result_refs.keys().sort((a,b) => Number(BigInt(`0x${a.hash.toString("hex")}`) - BigInt(`0x${b.hash.toString("hex")}`)))
        while (temp_keys.length > 0) {
            res = await ico.sendDeployRefs(user1.getSender(), toNano("0.1") * 50n, cur_addr)
            for (let i = 0; i < 50; i++) {
                if (temp_keys.length == 0) {
                    break
                }
                let to = await ico.getRefAddress(temp_keys.shift()!!)
                expect(res.transactions).toHaveTransaction({
                    from: ico.address,
                    to: to,
                    success: true,
                    deploy: true
                })
            }
            cur_addr = temp_keys.at(0)
        }
    })
    it('should return money if it failed', async () => {
        // send jettons
        await ico.sendDeployRefs(user1.getSender(), toNano("0.1"))
        let res = await user1JettonWallet.sendTransfer(user1.getSender(), toNano("0.15"), toNano(100000), ico.address, user1.address, null, toNano("0.1"), null)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(100000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()

        let user1Claim = blockchain.openContract(SbtNft.createFromAddress(await ico.getWalletAddress(user1.address)))
        let user1Ref = blockchain.openContract(RefWallet.createFromAddress(await ico.getRefAddress(user1.address)))

        let user2ClaimWl = blockchain.openContract(SbtNft.createFromAddress(await ico.getWalletAddress(wlSbt.address)))
        let user2Ref = blockchain.openContract(RefWallet.createFromAddress(await ico.getRefAddress(user2.address)))

        res = await ico.sendBuyRef(user1.getSender(), toNano(50), conf.refsDict.keys()[0])
        // printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.saleNotStarted
        })
        blockchain.now = conf.saleStartTime + 1

        // sale fails (less than min amount)
        res = await ico.sendBuyRef(user1.getSender(), toNano(10), conf.refsDict.keys()[0])
        // printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.lessThanMinPurchase
        })

        // sale fails (more than max amount)
        res = await ico.sendBuyRef(user1.getSender(), toNano(102), conf.refsDict.keys()[0])
        // printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.moreThanMaxPurchase
        })

        // sale confirms (sft created, ref wallet isn't called, ico sends excess)
        res = await ico.sendBuyRef(user1.getSender(), toNano("70.15"), conf.refsDict.keys()[0])
        // printTransactionFees(res.transactions)
        // console.log(res.events)
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Claim.address,
            op: OpCodes.UPDATE_SBT_DATA,
            deploy: true
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Ref.address,
            deploy: true,
            success: true,
            exitCode: 0
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: await ico.getRefAddress(conf.refsDict.keys()[0]),
            op: OpCodes.UPDATE_REF_WALLET,
            success: true
        })
        expect((await user1Claim.getStorageData()).purchased_jettons).toEqual(toNano(70) * conf.purchaseConditions.priceDevider * PERCENT_DEVIDER / (conf.purchaseConditions.priceFactor * (PERCENT_DEVIDER - BigInt(conf.refsDict.values()[0].discountFactor))))
        expect((await user1Ref.getStorageData()).init).toBeTruthy()
        // blockchain.verbosity.vmLogs = "vm_logs"
        res = await wlSbt.sendBuyWl(user2.getSender(), toNano("20.15"), {dest: ico.address, lvl: 0, ref: user1.address})
        // printTransactionFees(res.transactions)
        // prettyLogTransactions(res.transactions)
        // console.log(res.events)
        // console.log(res.transactions.at(-1)?.vmLogs)
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user2ClaimWl.address,
            op: OpCodes.UPDATE_SBT_DATA,
            deploy: true
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Ref.address,
            op: OpCodes.UPDATE_REF_WALLET,
            success: true
        })
        expect((await user1Ref.getStorageData()).collected_ton).toEqual((await user2ClaimWl.getStorageData()).collected_ton * (conf.defaultCashback) / PERCENT_DEVIDER)
        let inValue = (res.transactions.find((el) => el.inMessage?.body.asSlice().loadUint(32) == OpCodes.OWNERSHIP_PROOF)!!.inMessage?.info as CommonMessageInfoInternal).value.coins - toNano("0.15")
        expect((await user2ClaimWl.getStorageData()).collected_ton).toEqual(inValue)
        expect((await user2ClaimWl.getStorageData()).purchased_jettons).toEqual(inValue * conf.purchaseConditions.wlCondition1!!.priceDevider / conf.purchaseConditions.wlCondition1!!.priceFactor)

        blockchain.now = conf.saleEndTime + 1
        res = await ico.sendEndSell(user1.getSender(), toNano(1))
        // printTransactionFees(res.transactions)
        expect((await ico.getStorageData()).sale_finished).toBeTruthy();
        expect((await ico.getStorageData()).ton_collected).toBeLessThan((await blockchain.getContract(ico.address)).balance)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(0n)

        res = await user1Claim.sendRequestRefund(user1.getSender(), toNano("0.06"))
        // printTransactionFees(res.transactions)
        expect((res.transactions.find((el) => el.inMessage?.body.asSlice().loadUint(32) == 0)?.inMessage?.info as CommonMessageInfoInternal).value.coins).toBeGreaterThanOrEqual(70)

        res = await user2ClaimWl.sendRequestRefund(user2.getSender(), toNano("0.06"))
        expect((res.transactions.find((el) => el.inMessage?.body.asSlice().loadUint(32) == 0)?.inMessage?.info as CommonMessageInfoInternal).value.coins).toBeGreaterThanOrEqual(20)

        res = await user1Claim.sendRequestRefund(user1.getSender(), toNano("0.06"))
        expect(res.transactions).toHaveTransaction({
            to: user1Claim.address,
            exitCode: ErrorCodes.refundRequested
        })

        res = await user1Ref.sendClaimRef(user1.getSender(), toNano("0.1"))
        printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1.address,
            body: comment("Tokensale was unsuccessful")
        })
    })
    it('should sale with ref', async () => {        
        // send jettons
        let res = await user1JettonWallet.sendTransfer(user1.getSender(), toNano("0.15"), toNano(100000), ico.address, user1.address, null, toNano("0.1"), null)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(100000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()

        await ico.sendDeployRefs(user1.getSender(), toNano("0.1"))

        let user1Claim = blockchain.openContract(SbtNft.createFromAddress(await ico.getWalletAddress(user1.address)))
        let user1Ref = blockchain.openContract(RefWallet.createFromAddress(await ico.getRefAddress(user1.address)))

        let user2ClaimWl = blockchain.openContract(SbtNft.createFromAddress(await ico.getWalletAddress(wlSbt.address)))
        let user2Ref = blockchain.openContract(RefWallet.createFromAddress(await ico.getRefAddress(user2.address)))

        blockchain.now = conf.saleStartTime + 1

        // sale confirms (sft created, ref wallet isn't called, ico sends excess)
        let refWl = blockchain.openContract(RefWallet.createFromAddress(await ico.getRefAddress(ref.address)))
        res = await ico.sendBuyRef(user1.getSender(), toNano("10.15"), conf.refsDict.keys()[0])
        printTransactionFees(res.transactions)
        // console.log(res.events)
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Claim.address,
            op: OpCodes.UPDATE_SBT_DATA,
            deploy: true
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Claim.address,
            to: user1.address,
            op: OpCodes.TRANSFER_NOTIFICATION
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Claim.address,
            to: ico.address,
            op: OpCodes.APPROVE_PURCHASE
        })
        expect(res.transactions).not.toHaveTransaction({
            from: ico.address,
            to: user1Ref.address
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: refWl.address,
            op: OpCodes.UPDATE_REF_WALLET
        })
        expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(10))
        expect((await user1Claim.getStorageData()).purchased_jettons).toEqual(toNano(10) * conf.purchaseConditions.priceDevider * PERCENT_DEVIDER / (conf.purchaseConditions.priceFactor * (PERCENT_DEVIDER - BigInt(conf.refsDict.values()[0].discountFactor))))
        expect((await refWl.getStorageData()).collected_ton).toEqual(toNano(10) * BigInt(conf.refsDict.values()[0].cashbackFactor) / PERCENT_DEVIDER)


        // expect(await )

        // // sale confirms (ref wallet created)
        res = await ico.sendBuyRef(user1.getSender(), toNano("50.15"), conf.refsDict.keys()[0])
        // // printTransactionFees(res.transactions)
        // // console.log(await user1Claim.getStorageData())
        expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(60))
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Claim.address,
            op: OpCodes.UPDATE_SBT_DATA,
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Claim.address,
            to: user1.address,
            op: OpCodes.TRANSFER_NOTIFICATION
        })
        expect(res.transactions).toHaveTransaction({
            from: user1Claim.address,
            to: ico.address,
            op: OpCodes.APPROVE_PURCHASE
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: user1Ref.address,
            deploy: true
        })
        expect(res.transactions).toHaveTransaction({
            from: ico.address,
            to: refWl.address,
            op: OpCodes.UPDATE_REF_WALLET
        })

        expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(60))
        expect((await user1Claim.getStorageData()).purchased_jettons).toEqual(toNano(60) * conf.purchaseConditions.priceDevider * PERCENT_DEVIDER / (conf.purchaseConditions.priceFactor * (PERCENT_DEVIDER - BigInt(conf.refsDict.values()[0].discountFactor))))
        expect((await refWl.getStorageData()).collected_ton).toEqual(toNano(60) * BigInt(conf.refsDict.values()[0].cashbackFactor) / PERCENT_DEVIDER)

        // // sale confirms (ref wallet isn't called, ico sends excess)
        // res = await ico.sendBuyRef(user1.getSender(), toNano("10.15"), conf.refsDict.keys()[0])
        // // printTransactionFees(res.transactions)
        // expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(70))
        // expect((await user1Claim.getStorageData()).purchased_jettons).toEqual(toNano(70) * conf.purchaseConditions.priceDevider / conf.purchaseConditions.priceFactor)

        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     op: OpCodes.UPDATE_SBT_DATA
        // })
        // expect(res.transactions).toHaveTransaction({
        //     to: user1.address,
        //     op: OpCodes.TRANSFER_NOTIFICATION
        // })
        // expect(res.transactions).toHaveTransaction({
        //     to: ico.address,
        //     op: OpCodes.APPROVE_PURCHASE
        // })
        // expect(res.transactions).not.toHaveTransaction({
        //     from: ico.address,
        //     to: user1Ref.address
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     to: user1.address,
        //     op: OpCodes.EXCESSES
        // })

        // // sbt sale confirms (ref wallet sends excess, ico sends excess)
        // res = await ico.sendSimpleBuy(user1.getSender(), toNano("30.15"))
        // // printTransactionFees(res.transactions)

        // expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(100))

        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     op: OpCodes.UPDATE_SBT_DATA
        // })
        // expect(res.transactions).toHaveTransaction({
        //     to: user1.address,
        //     op: OpCodes.TRANSFER_NOTIFICATION
        // })
        // expect(res.transactions).toHaveTransaction({
        //     to: ico.address,
        //     op: OpCodes.APPROVE_PURCHASE
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     to: user1Ref.address
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     to: user1.address,
        //     op: OpCodes.EXCESSES
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: user1Ref.address,
        //     to: user1.address,
        //     op: OpCodes.EXCESSES
        // })

        // res = await ico.sendSimpleBuy(user1.getSender(), toNano("10.15"))
        // // printTransactionFees(res.transactions)

        // expect((await user1Claim.getStorageData()).collected_ton).toEqual(toNano(100))
        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     to: user1Claim.address,
        //     op: OpCodes.UPDATE_SBT_DATA
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: user1Claim.address,
        //     to: ico.address,
        //     op: OpCodes.CANCEL_PURCHASE
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     to: user1.address,
        //     op: 0,
        //     body: comment("Unsuccessful purchase")
        // })

        // res = await user1Claim.sendClaim(user1.getSender(), toNano("0.1"))
        // expect(res.transactions).toHaveTransaction({
        //     op: OpCodes.CLAIM,
        //     exitCode: ErrorCodes.notUnlockedYet
        // })

        res = await wlSbt.sendBuyWl(user2.getSender(), toNano("30000.15"), {dest: ico.address, lvl: 0, ref: user1.address})
        // printTransactionFees(res.transactions)

        let value = (res.transactions.find(elem => elem.inMessage?.body.asSlice().loadUint(32) == OpCodes.OWNERSHIP_PROOF)?.inMessage?.info as CommonMessageInfoInternal).value.coins - toNano("0.15")
        expect((await user2ClaimWl.getStorageData()).collected_ton).toEqual(value)
        expect((await user2ClaimWl.getStorageData()).purchased_jettons).toEqual(value * conf.purchaseConditions.wlCondition1!!.priceDevider / conf.purchaseConditions.wlCondition1!!.priceFactor)

        expect((await user1Ref.getStorageData()).collected_ton).toEqual(value * BigInt(conf.defaultCashback) / PERCENT_DEVIDER)
        console.log((await blockchain.getContract(ico.address)).balance)

        // expect((await user2ClaimWl.getStorageData()).collected_ton).toBeGreaterThan(toNano(29999))
        // expect((await user2ClaimWl.getStorageData()).collected_ton).toBeLessThanOrEqual(toNano(30000))
        // expect((await user2ClaimWl.getStorageData()).purchased_jettons).toBeGreaterThan(toNano(29999) * conf.purchaseConditions.wlCondition1!!.priceDevider / conf.purchaseConditions.wlCondition1!!.priceFactor)
        // expect((await user2ClaimWl.getStorageData()).purchased_jettons).toBeLessThanOrEqual(toNano(30000) * conf.purchaseConditions.wlCondition1!!.priceDevider / conf.purchaseConditions.wlCondition1!!.priceFactor)

        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     to: user2ClaimWl.address,
        //     op: OpCodes.UPDATE_SBT_DATA,
        //     deploy: true
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: user2ClaimWl.address,
        //     to: user2.address,
        //     op: OpCodes.TRANSFER_NOTIFICATION
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: user2ClaimWl.address,
        //     to: ico.address,
        //     op: OpCodes.APPROVE_PURCHASE
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     to: user2Ref.address,
        //     deploy: true
        // })
        // expect(res.transactions).toHaveTransaction({
        //     from: ico.address,
        //     to: user2.address,
        //     op: OpCodes.EXCESSES
        // })
        // // printTransactionFees(res.transactions)
        // // console.log(res.events)
        // // console.log(res.transactions[2].vmLogs)

        blockchain.now = conf.saleEndTime + 1
        res = await ico.sendEndSell(user1.getSender(), toNano(1))
        printTransactionFees(res.transactions)
        console.log((await ico.getStorageData()).ton_collected)
        // prettyLogTransactions(res.transactions)
        // // console.log(res.events)
        expect(res.transactions).toHaveTransaction({
            to: jettonVault.address,
            op: OpCodes.TRANSFER_NOTIFICATION
        })

        expect((res.transactions.find(el => (el.inMessage?.info as CommonMessageInfoInternal).dest.toString() == admin.address.toString())?.
            inMessage?.info as CommonMessageInfoInternal).value.coins).
            toEqual((await ico.getStorageData()).ton_collected * BigInt(conf.commission_factors.get(0n)!!) / PERCENT_DEVIDER)
        expect((res.transactions.find(el => (el.inMessage?.info as CommonMessageInfoInternal).dest.toString() == jettonVault.address.toString())!!.inMessage?.body.asSlice().skip(32+64).loadCoins())).
            toEqual((await ico.getStorageData()).jettons_sold * PERCENT_DEVIDER / (PERCENT_DEVIDER - BigInt((await ico.getStorageData()).liquidity_part_jetton)) * BigInt(conf.liquidityPartJetton) / PERCENT_DEVIDER)

        console.log((await blockchain.getContract(ico.address)).balance)

        let val = (await user1Ref.getStorageData()).collected_ton
        let refBalance = (await blockchain.getContract(user1Ref.address)).balance
        res = await user1Ref.sendClaimRef(user1.getSender(), toNano("0.1"))
        printTransactionFees(res.transactions)
        expect((res.transactions.find(elem => elem.inMessage?.body.asSlice().loadUint(32) == 0)?.inMessage?.info as CommonMessageInfoInternal).value.coins).toBeGreaterThanOrEqual(val)
        expect((res.transactions.find(elem => elem.inMessage?.body.asSlice().loadUint(32) == 0)?.inMessage?.info as CommonMessageInfoInternal).value.coins).toBeLessThan(val + toNano("0.1") + refBalance)

        await jettonRoot.sendMint(admin.getSender(), user1.address, toNano(1000), toNano("0.03"), toNano("0.06"))
        res = await user1JettonWallet.sendTransfer(user1.getSender(), toNano("0.2"), toNano(1000), ico.address, user1.address, null, toNano("0.1"), beginCell().storeUint(OpCodes.LIQUIDITY_FULFILL, 32).endCell())
        printTransactionFees(res.transactions)
        prettyLogTransactions(res.transactions)
        // expect((await ico.getStorageData()).ton_collected).toBeGreaterThanOrEqual((await ico.getStorageData()).min_ton_collected)

        // res = await user1Claim.sendRequestRefund(user1.getSender(), toNano("0.1"))
        // expect(res.transactions).toHaveTransaction({
        //     to: ico.address,
        //     exitCode: ErrorCodes.saleSucceed
        // })
        // await user1JettonWalletAddress.sendBurn(user1.getSender(), toNano(1), await user1JettonWalletAddress.getJettonBalance(), user1.address, Cell.EMPTY)
        // expect(await user1JettonWalletAddress.getJettonBalance()).toEqual(0n)

        // res = await user1Claim.sendClaim(user1.getSender(), toNano("0.1"))
        // expect(res.transactions).toHaveTransaction({
        //     to: user1Claim.address,
        //     op: OpCodes.CLAIM,
        //     exitCode: ErrorCodes.notUnlockedYet
        // })

    })
});
