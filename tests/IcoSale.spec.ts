import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton-community/sandbox';
import { Address, Cell, Dictionary, toNano } from 'ton-core';
import { RefWallet } from '../wrappers/RefWallet';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { IcoSale, IcoSaleConfig, PurchaseConditionsRoot, RefsDictValue } from '../wrappers/IcoSale';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMinter } from '../wrappers/JettonMinter';
import { SbtSingle } from '../wrappers/SbtSingle';
import { randomAddress } from '@ton-community/test-utils';
import { ErrorCodes } from '../wrappers/helpers/constants';

describe('RefWallet', () => {
    let icoSaleCode: Cell;
    let refWalletCode: Cell
    let sbtCode: Cell
    let wlSbtCode: Cell
    let jettonRootCode: Cell
    let jettonWalletCode: Cell

    let jettonWalletAddress: SandboxContract<JettonWallet>
    let user1JettonWalletAddress: SandboxContract<JettonWallet>
    let adminAddress: SandboxContract<TreasuryContract>;
    let ownerAddress: SandboxContract<TreasuryContract>;
    let jettonRootAddress: SandboxContract<JettonMinter>;
    let nativeVaultAddress: Address;
    let jettonVaultAddress: Address;
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
        wlSbtCode = await compile('SbtSingle')
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
        
        jettonRootAddress = blockchain.openContract(JettonMinter.createFromConfig({admin: adminAddress.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonRootCode))
        await jettonRootAddress.sendMint(adminAddress.getSender(), user1.address, toNano(999999999999), toNano("0.2"), toNano("0.5"))
        user1JettonWalletAddress = blockchain.openContract(JettonWallet.createFromAddress(await jettonRootAddress.getWalletAddress(user1.address)))

        wlSbt = blockchain.openContract(SbtSingle.createFromConfig({collection_address: wlCollectionAddress.address, index: 0n}, sbtCode))
        await wlSbt.sendDeploy(wlCollectionAddress.getSender(), toNano("0.1"), {owner: user1.address, content: Cell.EMPTY})

        nativeVaultAddress = randomAddress()
        jettonVaultAddress = randomAddress()

        let purchaseConditions = {
            priceFactor: 90n,
            priceDevider: 100n,
            minPurchaseTon: toNano(10),
            maxPurchaseTon: toNano(100),
                wlCondition1: {
                    priceFactor: 85n,
                    priceDevider: 100n,
                    minPurchaseTon: toNano(10),
                    maxPurchaseTon: toNano(150), wlSbtCode, 
                    wlCollectionAddress: wlCollectionAddress.address
                }
        }
        let commission_factors: Dictionary<bigint, number> = Dictionary.empty()
        let refsDict: Dictionary<Address, RefsDictValue> = Dictionary.empty()
        refsDict = refsDict.set(ref.address, {cashbackFactor: 10, discountFactor: 5})
        conf = {
            saleStartTime: nowSetting + 1000,
            saleEndTime: nowSetting + 10000,

            minTonCollected: toNano(30000),
            allocatedJettons: toNano(30000),
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
            nativeVaultAddress,
            jettonVaultAddress,
            purchaseConditions,
            commission_factors,

            minRefPurchase: toNano(50),
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

        res = await fakeUser1Wallet.sendTransfer(user1.getSender(), toNano("0.15"), toNano(30000), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await fakeIcoWallet.getJettonBalance()).toEqual(toNano(0))
        expect((await ico.getStorageData()).jettons_added).toBeFalsy()

        res = await user1JettonWalletAddress.sendTransfer(user1.getSender(), toNano("0.15"), toNano(30000), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(30000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()
        res = await user1JettonWalletAddress.sendTransfer(user1.getSender(), toNano("0.15"), toNano(30000), ico.address, user1.address, null, toNano("0.1"), null)
        // printTransactionFees(res.transactions)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(30000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()
    });
    it('should sale without wl and ref', async () => {
        let res = await user1JettonWalletAddress.sendTransfer(user1.getSender(), toNano("0.15"), toNano(30000), ico.address, user1.address, null, toNano("0.1"), null)
        expect(await jettonWalletAddress.getJettonBalance()).toEqual(toNano(30000))
        expect((await ico.getStorageData()).jettons_added).toBeTruthy()

        res = await ico.sendSimpleBuy(user1.getSender(), toNano(500))
        // printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.saleNotStarted
        })
        blockchain.now = conf.saleStartTime + 1
        res = await ico.sendSimpleBuy(user1.getSender(), toNano(10))
        // printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.lessThanMinPurchase
        })
        res = await ico.sendSimpleBuy(user1.getSender(), toNano(101))
        // printTransactionFees(res.transactions)
        expect(res.transactions).toHaveTransaction({
            to: ico.address,
            exitCode: ErrorCodes.moreThanMaxPurchase
        })
        res = await ico.sendSimpleBuy(user1.getSender(), toNano(20))
        printTransactionFees(res.transactions)
        // console.log(res.transactions)
        // expect(res.transactions).toHaveTransaction({
        //     to: ico.address,
        //     exitCode: ErrorCodes.lessThanMinPurchase
        // })
    })
});
