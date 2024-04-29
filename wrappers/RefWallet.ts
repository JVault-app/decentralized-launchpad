import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type RefWalletConfig = {};

export function refWalletConfigToCell(config: RefWalletConfig): Cell {
    return beginCell().endCell();
}

export class RefWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new RefWallet(address);
    }

    static createFromConfig(config: RefWalletConfig, code: Cell, workchain = 0) {
        const data = refWalletConfigToCell(config);
        const init = { code, data };
        return new RefWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
