import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Address, Cell, Dictionary, toNano } from 'ton-core';
import { RefWallet } from '../wrappers/RefWallet';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { IcoSaleConfig, PurchaseConditionsRoot, RefsDictValue } from '../wrappers/IcoSale';

describe('RefWallet', () => {
    let icoSaleCode: Cell;
    let refWalletCode: Cell
    let sbtCode: Cell
    let wlSbtCode: Cell
    let conf: IcoSaleConfig

    let jettonWalletAddress: Address
    let adminAddress: Address;
    let ownerAddress: Address;
    let jettonRootAddress: Address;
    let nativeVaultAddress: Address;
    let jettonVaultAddress: Address;
    let wlCollectionAddress: Address;
    let ref: Address;

    let purchaseConditions: PurchaseConditionsRoot

    beforeAll(async () => {
        icoSaleCode = await compile('IcoSale')
        refWalletCode = await compile('RefWallet');
        sbtCode = await compile('SbtNft')
    });

    let blockchain: Blockchain;


    beforeEach(async () => {
        blockchain = await Blockchain.create();

        purchaseConditions = {
            priceFactor: 90n,
            priceDevider: 100n,
            minPurchaseTon: toNano(10),
            maxPurchaseTon: toNano(100),
                wlCondition1: {priceFactor: 85n,
                    priceDevider: 100n,
                    minPurchaseTon: toNano(10),
                    maxPurchaseTon: toNano(150), wlSbtCode, wlCollectionAddress}
        }
        let commission_factors: Dictionary<bigint, number> = Dictionary.empty()
        let refsDict: Dictionary<Address, RefsDictValue> = Dictionary.empty()
        refsDict = refsDict.set(ref, {cashbackFactor: 10, discountFactor: 5})
        conf = {
            saleStartTime: 0,
            saleEndTime: 0,

            minTonCollected: toNano(30000),
            allocatedJettons: toNano(30000),
            liquidityPartTon: 80000000,
            liquidityPartJetton: 40000000,

            firstUnlockTime: 0,
            firstUnlockSize: 10000000,
            cycleLength: 3600,
            cyclesNumber: 10,

            jettonWalletAddress: jettonWalletAddress,

            adminAddress: adminAddress,
            ownerAddress: ownerAddress,
            content: Cell.EMPTY,
            sbtItemCode: sbtCode,

            jettonRootAddress,
            nativeVaultAddress,
            jettonVaultAddress,
            purchaseConditions,
            commission_factors,

            minRefPurchase: toNano(50),
            defaultCashback: 1000,
            refsDict,
            refWalletCode: refWalletCode
        }

        // refWallet = blockchain.openContract(RefWallet.createFromConfig({}, code));

        // const deployer = await blockchain.treasury('deployer');

        // const deployResult = await refWallet.sendDeploy(deployer.getSender(), toNano('0.05'));

        // expect(deployResult.transactions).toHaveTransaction({
        //     from: deployer.address,
        //     to: refWallet.address,
        //     deploy: true,
        //     success: true,
        // });
    });

    // it('should deploy', async () => {
    //     // the check is done inside beforeEach
    //     // blockchain and refWallet are ready to use
    // });
});
