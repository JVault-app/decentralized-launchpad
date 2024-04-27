import { toNano } from 'ton-core';
import { SbtNft } from '../wrappers/SbtNft';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const sbtNft = provider.open(
        SbtNft.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('SbtNft')
        )
    );

    await sbtNft.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(sbtNft.address);

    console.log('ID', await sbtNft.getID());
}
