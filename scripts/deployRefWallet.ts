import { toNano } from 'ton-core';
import { RefWallet } from '../wrappers/RefWallet';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const refWallet = provider.open(RefWallet.createFromConfig({}, await compile('RefWallet')));

    await refWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(refWallet.address);

    // run methods on `refWallet`
}
