import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type RefWalletConfig = {
    ownerAddress: Address;
    collectionAddress: Address;
    saleEndTime: number;
};

export function refWalletConfigToCell(config: RefWalletConfig): Cell {
    return beginCell()
                .storeAddress(config.ownerAddress)
                .storeAddress(config.collectionAddress)
                .storeUint(config.saleEndTime, 32)
                .storeBit(0)
            .endCell();
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

    async getStorageData(provider: ContractProvider) {
        let { stack } = await provider.get('get_wallet_data', []);
        return {
            init: stack.readNumber(),
            owner_address: stack.readAddress(),
            collection_address: stack.readAddress(),
            sale_end_time: stack.readNumber(),
            collected_ton: stack.readBigNumber(),
        }
    }

}
