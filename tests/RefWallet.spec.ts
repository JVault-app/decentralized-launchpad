import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { RefWallet } from '../wrappers/RefWallet';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('RefWallet', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('RefWallet');
    });

    let blockchain: Blockchain;
    let refWallet: SandboxContract<RefWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        refWallet = blockchain.openContract(RefWallet.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await refWallet.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: refWallet.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and refWallet are ready to use
    });
});
