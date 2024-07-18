import { Address, Dictionary, toNano } from 'ton-core';
import { SaleAdmin } from '../wrappers/SaleAdmin';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { RefsDictValue } from '../wrappers/IcoSale';
import { PERCENT_DEVIDER } from '../wrappers/helpers/constants';

export async function run(provider: NetworkProvider) {

    let purchaseConditions = {
        priceFactor: 2n,
        priceDevider: 1n,
        minPurchaseTon: toNano(10),
        maxPurchaseTon: toNano(100),
    }
    let commission_factors: Dictionary<bigint, number> = Dictionary.empty()
    commission_factors = commission_factors.set(toNano(0), 1000000)

    let creationFees: Dictionary<bigint, bigint> = Dictionary.empty()
    creationFees = creationFees.set((1n << 120n) - 1n, toNano(100))

    const sender_address = provider.sender().address!!;
    const saleAdmin = provider.open(SaleAdmin.createFromConfig({
        ownerAddress: sender_address,
        revenueShareAddresses: [{address: sender_address, share: Number(PERCENT_DEVIDER)}],
        creationFees: creationFees,
        commissionFactors: commission_factors,
        icoSaleCode: await compile("IcoSale"),
        sbtItemCode: await compile("SftItem"),
        refWalletCode: await compile("RefWallet")
    }, await compile('SaleAdmin')));

    await saleAdmin.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(saleAdmin.address);

    // run methods on `saleAdmin`
}
