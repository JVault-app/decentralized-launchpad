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
import { SaleAdmin } from '../wrappers/SaleAdmin';

describe('Ico', () => {
    let icoSaleCode: Cell;
    let refWalletCode: Cell
    let sbtCode: Cell
    let sbtSingleCode: Cell
    let jettonRootCode: Cell
    let jettonWalletCode: Cell
    let saleAdminCode: Cell

    let jettonWalletAddress: SandboxContract<JettonWallet>
    let user1JettonWalletAddress: SandboxContract<JettonWallet>
    let adminJettonWallet: SandboxContract<JettonWallet>
    let adminAddress: SandboxContract<SaleAdmin>;
    let ownerAddress: SandboxContract<TreasuryContract>;
    let founder: SandboxContract<TreasuryContract>;
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
        saleAdminCode = await compile("SaleAdmin")
    });

    let blockchain: Blockchain;
    let conf: IcoSaleConfig

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = nowSetting

        wlCollectionAddress = await blockchain.treasury("WlCollection")
        founder = await blockchain.treasury("founder")
        ownerAddress = await blockchain.treasury("owner")
        user1 = await blockchain.treasury("user1")
        user2 = await blockchain.treasury("user2")
        ref = await blockchain.treasury("ref")

        nativeVaultAddress = await blockchain.treasury("native vault")
        jettonVaultAddress = await blockchain.treasury("jetton vault")
        await nativeVaultAddress.send({to: nativeVaultAddress.address, value: toNano(1)})
        await jettonVaultAddress.send({to: jettonVaultAddress.address, value: toNano(1)})
        
        jettonRootAddress = blockchain.openContract(JettonMinter.createFromConfig({admin: founder.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonRootCode))
        await jettonRootAddress.sendMint(founder.getSender(), user1.address, toNano(100), toNano("0.2"), toNano("0.5"))
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
                    priceFactor: 15n,
                    priceDevider: 10n,
                    minPurchaseTon: toNano(10),
                    maxPurchaseTon: toNano(30000), wlSbtCode: sbtSingleCode, 
                    wlCollectionAddress: wlCollectionAddress.address
                }
        }
        let commission_factors: Dictionary<bigint, number> = Dictionary.empty()
        let refsDict: Dictionary<Address, RefsDictValue> = Dictionary.empty()
        refsDict = refsDict.set(ref.address, {cashbackFactor: 20, discountFactor: 100})
        commission_factors = commission_factors.set(toNano(0), 1000000)

        let creationFees: Dictionary<bigint, bigint> = Dictionary.empty()
        creationFees = creationFees.set((1n << 120n) - 1n, toNano(100))
        adminAddress = blockchain.openContract(SaleAdmin.createFromConfig({ownerAddress: founder.address, revenueShareAddresses: [{address:user1.address, share: 60000000}, {address: user2.address, share: 40000000}], icoSaleCode, refWalletCode, sbtItemCode: sbtCode, creationFees, commissionFactors: commission_factors}, saleAdminCode))
        adminJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonRootAddress.getWalletAddress(adminAddress.address)))



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

            adminAddress: adminAddress.address,
            ownerAddress: user1.address,
            content: Cell.EMPTY,
            sftItemCode: sbtCode,

            jettonRootAddress: jettonRootAddress.address,
            nativeVaultAddress: nativeVaultAddress.address,
            jettonVaultAddress: jettonVaultAddress.address,
            purchaseConditions,
            commission_factors,

            minRefPurchase: toNano(20),
            defaultCashback: 1000000n,
            refsDict,
            refWalletCode: refWalletCode,
            changeInvitee: false,
            returnJettons: true,
        }

        ico = blockchain.openContract(IcoSale.createFromConfig(conf, icoSaleCode))
        jettonWalletAddress = blockchain.openContract(JettonWallet.createFromAddress(await jettonRootAddress.getWalletAddress(ico.address)))
        
        await adminAddress.sendChangeJettonWallet(founder.getSender(), toNano('0.05'), adminJettonWallet.address)
        expect((await adminAddress.getStorageData()).jetton_wallet_address).toEqualAddress(adminJettonWallet.address)
    });

    it('should deploy ico sale', async () => {
        let res = await user1JettonWalletAddress.sendTransfer(user1.getSender(), toNano(2), toNano(100), adminAddress.address, user1.address, null, toNano("1.25"), SaleAdmin.createRequestSaleDeployMessage(conf))
        printTransactionFees(res.transactions)
        let t = res.transactions.find(el => el.inMessage?.body.asSlice().loadUint(32) == 0x7362d09c)

        let user2Jetton = blockchain.openContract(JettonWallet.createFromAddress(await jettonRootAddress.getWalletAddress(user2.address)))
        expect(await user1JettonWalletAddress.getJettonBalance()).toEqual(toNano(60))
        expect(await user2Jetton.getJettonBalance()).toEqual(toNano(40))
        const data = await ico.getStorageData()
        expect(data.jetton_wallet_address).toEqualAddress(await jettonRootAddress.getWalletAddress(ico.address))
        expect(data.init).toBeTruthy()
    });
});
