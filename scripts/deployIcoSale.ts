import { Address, Cell, Dictionary, toNano } from 'ton-core';
import { IcoSale, RefsDictValue } from '../wrappers/IcoSale';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { PERCENT_DEVIDER } from '../wrappers/helpers/constants';
import { buildOnchainMetadata } from '../wrappers/buildOnchain';

export async function run(provider: NetworkProvider) {
    let nowSetting = Math.ceil(Date.now() / 1000)
    // const my_address = Address.parse("0QAz2fQ6CbjW9IhexJTMWvt6nQRVIIsfoNLGUmvRNLvUSbDD")
    // const my_address_2 = Address.parse("0QAWES8quo0uywd5s5-542nlg0tvuVzG17tHHjg3tDjWYdpU")
    const jetton_root_address = Address.parse("kQDwaStbpYPx0BKbunsDrd63uBfwQ4-ipyAUnwmeuZ9pBXyg")
    // const wl_collection_address = Address.parse("kQBie8XPJtjfheZdjN0ZVVzTgWmX0RQfqIhSJAAouM70J0m2")
    // const wlSbtCode = Cell.fromBase64("te6ccgECDgEAAdwAART/APSkE/S88sgLAQIBYgIDAgLOBAUACaEfn+AFAgEgBgcCASAMDQLPDIhxwCSXwPg0NMDAXGwkl8D4PpA+kAx+gAxcdch+gAx+gAwc6m0APACBLOOFDBsIjRSMscF8uGVAfpA1DAQI/AD4AbTH9M/ghBfzD0UUjC64wIwNDQ1NYIQL8smohK64wJfBIQX8vCAICQARPpEMHC68uFNgAqwyEDdeMkATUTXHBfLhkfpAIfAB+kDSADH6ACDXScIA8uLEggr68IAboSGUUxWgod4i1wsBwwAgkgahkTbiIML/8uGSIZQQKjdb4w0CkzAyNOMNVQLwAwoLAHJwghCLdxc1BcjL/1AEzxYQJIBAcIAQyMsFUAfPFlAF+gIVy2oSyx/LPyJus5RYzxcBkTLiAckB+wAAfIIQBRONkchQCc8WUAvPFnEkSRRURqBwgBDIywVQB88WUAX6AhXLahLLH8s/Im6zlFjPFwGRMuIByQH7ABBHAGom8AGCENUydtsQN0QAbXFwgBDIywVQB88WUAX6AhXLahLLH8s/Im6zlFjPFwGRMuIByQH7AAA7O1E0NM/+kAg10nCAJp/AfpA1DAQJBAj4DBwWW1tgAB0A8jLP1jPFgHPFszJ7VSA=")

    const refWalletCode = await compile('RefWallet');
    const sftCode = await compile('SftItem')
    const jettonRootCode = await compile('JettonMinter')
    const jettonWalletCode = await compile('JettonWallet')
    const sbtSingleCode = await compile('SbtSingle')

    let purchaseConditions = {
        priceFactor: 2n,
        priceDevider: 1n,
        minPurchaseTon: toNano(1),
        maxPurchaseTon: toNano(100),
            // wlCondition1: {
            //     priceFactor: 1n,
            //     priceDevider: 1n,
            //     minPurchaseTon: toNano(10),
            //     maxPurchaseTon: toNano(30000), wlSbtCode: wlSbtCode, 
            //     wlCollectionAddress: wl_collection_address
            // }
    }
    let commission_factors: Dictionary<bigint, number> = Dictionary.empty()
    let refsDict: Dictionary<Address, RefsDictValue> = Dictionary.empty()
    // refsDict = refsDict.set(my_address_2, {cashbackFactor: 20, discountFactor: 100})
    commission_factors = commission_factors.set(toNano(0), 1000000)

    const icoSale = provider.open(IcoSale.createFromConfig({
        saleStartTime: nowSetting,
        saleEndTime: nowSetting + 100000,

        minTonCollected: toNano(1),
        allocatedJettons: toNano(1000),
        liquidityPartTon: 80000000,
        liquidityPartJetton: 40000000,

        firstUnlockTime: nowSetting + 12000,
        firstUnlockSize: (PERCENT_DEVIDER / 10n),  // first unlock = 10%
        cycleLength: 3600,
        cyclesNumber: 10,  // next unlocks = 9%

        adminAddress: provider.sender().address!!,
        ownerAddress: provider.sender().address!!,
        content: buildOnchainMetadata({name: "aboba check", description: "aboba token test", symbol: "bobat", image: "https://media.tenor.com/4cTJ4sDdIn0AAAAe/aboba.png"}),
        sftItemCode: sftCode,

        jettonRootAddress: jetton_root_address,
        nativeVaultAddress: jetton_root_address,
        jettonVaultAddress: jetton_root_address,
        purchaseConditions,
        commission_factors,

        minRefPurchase: toNano(1),
        defaultCashback: 1000n,
        refsDict,
        refWalletCode: refWalletCode,
        changeInvitee: false,
    }, await compile('IcoSale')));

    await icoSale.sendDeploy(provider.sender(), toNano('0.2'));

    await provider.waitForDeploy(icoSale.address);

    // run methods on `saleAdmin`
}
