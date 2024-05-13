import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type SaleAdminConfig = {

    ownerAddress: Address;
    jettonWalletAddress: Address;
    revenueShareAddresses: Cell;

    creationFees: Cell;
    commissionFactors: Cell;
    icoSaleCode: Cell;
    sbtItemCode: Cell;
    refWalletCode: Cell;
};

export function saleAdminConfigToCell(config: SaleAdminConfig): Cell {
    return beginCell()
                .storeAddress(config.ownerAddress)
                .storeRef(
                    beginCell()
                        .storeRef(config.icoSaleCode)
                        .storeRef(config.sbtItemCode)
                        .storeRef(config.refWalletCode)
                    .endCell()
                )
                .storeRef(config.creationFees)
                .storeRef(config.commissionFactors)
                .storeRef(config.revenueShareAddresses)
                .storeAddress(config.jettonWalletAddress)
            .endCell();
}

export class SaleAdmin implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new SaleAdmin(address);
    }

    static createFromConfig(config: SaleAdminConfig, code: Cell, workchain = 0) {
        const data = saleAdminConfigToCell(config);
        const init = { code, data };
        return new SaleAdmin(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
