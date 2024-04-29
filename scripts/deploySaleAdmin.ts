import { toNano } from 'ton-core';
import { SaleAdmin } from '../wrappers/SaleAdmin';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const saleAdmin = provider.open(SaleAdmin.createFromConfig({}, await compile('SaleAdmin')));

    await saleAdmin.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(saleAdmin.address);

    // run methods on `saleAdmin`
}
