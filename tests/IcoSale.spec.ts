import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton-community/sandbox';
import { Address, Cell, Dictionary, comment, toNano } from 'ton-core';
import { RefWallet } from '../wrappers/RefWallet';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { IcoSale, IcoSaleConfig, PurchaseConditionsRoot, RefsDictValue } from '../wrappers/IcoSale';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMinter } from '../wrappers/JettonMinter';
import { SbtSingle } from '../wrappers/SbtSingle';
import { randomAddress } from '@ton-community/test-utils';
import { ErrorCodes, OpCodes } from '../wrappers/helpers/constants';
import { SbtNft } from '../wrappers/SftItem';

describe('Ico', () => {
    let icoSaleCode: Cell;
    let refWalletCode: Cell
    let sbtCode: Cell
    let sbtSingleCode: Cell
    let jettonRootCode: Cell
    let jettonWalletCode: Cell

    let jettonWalletAddress: SandboxContract<JettonWallet>
    let user1JettonWalletAddress: SandboxContract<JettonWallet>
    let adminAddress: SandboxContract<TreasuryContract>;
    let ownerAddress: SandboxContract<TreasuryContract>;
    let jettonRootAddress: SandboxContract<JettonMinter>;
    let nativeVaultAddress: SandboxContract<TreasuryContract>;
    let jettonVaultAddress: SandboxContract<TreasuryContract>;
    let wlCollectionAddress: SandboxContract<TreasuryContract>;
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

        wlCollectionAddress = await blockchain.treasury("WlCollection")
        adminAddress = await blockchain.treasury("admin")
        ownerAddress = await blockchain.treasury("owner")
        user1 = await blockchain.treasury("user1")
        user2 = await blockchain.treasury("user2")
        ref = await blockchain.treasury("ref")

        nativeVaultAddress = await blockchain.treasury("native vault")
        jettonVaultAddress = await blockchain.treasury("jetton vault")
        await nativeVaultAddress.send({to: nativeVaultAddress.address, value: toNano(1)})
        await jettonVaultAddress.send({to: jettonVaultAddress.address, value: toNano(1)})
        
        jettonRootAddress = blockchain.openContract(JettonMinter.createFromConfig({admin: adminAddress.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonRootCode))
        await jettonRootAddress.sendMint(adminAddress.getSender(), user1.address, toNano(999999999999), toNano("0.2"), toNano("0.5"))
        user1JettonWalletAddress = blockchain.openContract(JettonWallet.createFromAddress(await jettonRootAddress.getWalletAddress(user1.address)))

        wlSbt = blockchain.openContract(SbtSingle.createFromConfig({collection_address: wlCollectionAddress.address, index: 0n}, sbtSingleCode))
        const wlres = await wlSbt.sendDeploy(wlCollectionAddress.getSender(), toNano("0.1"), {owner: user2.address, content: Cell.EMPTY})
        // console.log(wlres.transactions)
        expect((await wlSbt.getData()).init).toBeTruthy()

        let purchaseConditions = {
            priceFactor: 2n,
            priceDevider: 1n,
            minPurchaseTon: toNano(10),
            maxPurchaseTon: toNano(100),
                wlCondition1: {
                    priceFactor: 1n,
                    priceDevider: 1n,
                    minPurchaseTon: toNano(10),
                    maxPurchaseTon: toNano(30000), wlSbtCode: sbtSingleCode, 
                    wlCollectionAddress: wlCollectionAddress.address
                }
        }
        let commission_factors: Dictionary<bigint, number> = Dictionary.empty()
        let refsDict: Dictionary<Address, RefsDictValue> = Dictionary.empty()
        refsDict = refsDict.set(ref.address, {cashbackFactor: 20, discountFactor: 100})
        commission_factors = commission_factors.set(toNano(0), 1000000)

        conf = {
            saleStartTime: nowSetting + 1000,
            saleEndTime: nowSetting + 10000,

            minTonCollected: toNano(30000),
            allocatedJettons: toNano(100000),
            liquidityPartTon: 80000000,
            liquidityPartJetton: 40000000,

            firstUnlockTime: nowSetting + 12000,
            firstUnlockSize: 10000000,
            cycleLength: 3600,
            cyclesNumber: 10,

            adminAddress: adminAddress.address,
            ownerAddress: ownerAddress.address,
            content: Cell.EMPTY,
            sbtItemCode: sbtCode,

            jettonRootAddress: jettonRootAddress.address,
            nativeVaultAddress: nativeVaultAddress.address,
            jettonVaultAddress: jettonRootAddress.address,
            purchaseConditions,
            commission_factors,

            minRefPurchase: toNano(20),
            defaultCashback: 1000,
            refsDict,
            refWalletCode: refWalletCode,
            changeInvitee: false,
        }

        ico = blockchain.openContract(IcoSale.createFromConfig(conf, icoSaleCode))
        jettonWalletAddress =blockchain.openContract(JettonWallet.createFromAddress(await jettonRootAddress.getWalletAddress(ico.address)))
        await ico.sendDeploy(adminAddress.getSender(), toNano(1))
    });

    it('should deploy', async () => {
        const data = await ico.getStorageData()
        expect(data.jetton_wallet_address).toEqualAddress(await jettonRootAddress.getWalletAddress(ico.address))
        expect(data.init).toBeTruthy()
    });
    it('should receive tokens', async () => {
        expect((await ico.getStorageData()).jettons_added).toBeFalsy()
        let res = await user1JettonWalletAddress.sendTransfer(user1.getSender(), toNano("0.15"), toNano(20), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(0n)
        expect((await ico.getStorageData()).jettons_added).toBeFalsy()
        res = await user1JettonWalletAddress.sendTransfer(user1.getSender(), toNano("0.15"), toNano(40000), ico.address, user1.address, null, toNano("0.1"), null)
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

        res = await user1JettonWalletAddress.sendTransfer(user1.getSender(), toNano("0.15"), toNano(100000), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(100000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()
        res = await user1JettonWalletAddress.sendTransfer(user1.getSender(), toNano("0.15"), toNano(100000), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(100000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()
    });
    it('should sale without wl and ref', async () => {
        conf.minTonCollected = toNano(50)
        
        // send jettons
        let res = await user1JettonWalletAddress.sendTransfer(user1.getSender(), toNano("0.15"), toNano(100000), ico.address, user1.address, null, toNano("0.1"), null)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(100000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()

        let user1Claim = blockchain.openContract(SbtNft.createFromAddress(await ico.getWalletAddress(user1.address)))
        let user1Ref = blockchain.openContract(RefWallet.createFromAddress(await ico.getRefAddress(user1.address)))

        let user2ClaimWl = blockchain.openContract(SbtNft.createFromAddress(await ico.getWalletAddress(wlSbt.address)))
        let user2Ref = blockchain.openContract(RefWallet.createFromAddress(await ico.getRefAddress(user2.address)))

        // sale fails (not started)
        res = await ico.sendSimpleBuy(user1.getSender(), toNano(500))
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

        blockchain.now = conf.saleEndTime + 100000
        res = await ico.sendEndSell(user1.getSender(), toNano(1))
        printTransactionFees(res.transactions)
        // console.log(res.events)
        expect(res.transactions).toHaveTransaction({
            to: jettonVaultAddress.address,
        })
        // console.log(res.events)
        // console.log(res.transactions)
    })
});
