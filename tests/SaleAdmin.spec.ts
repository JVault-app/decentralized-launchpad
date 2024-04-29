import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { SaleAdmin } from '../wrappers/SaleAdmin';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('SaleAdmin', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('SaleAdmin');
    });

    let blockchain: Blockchain;
    let saleAdmin: SandboxContract<SaleAdmin>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        saleAdmin = blockchain.openContract(SaleAdmin.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await saleAdmin.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: saleAdmin.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and saleAdmin are ready to use
    });
});
