import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode } from 'ton-core';
import internal from 'stream';


export type IcoSaleConfig = {
    saleStartTime: number;
    saleEndTime: number;

    minTonCollected: bigint;
    allocatedJettons: bigint;
    liquidityPartTon: number;
    liquidityPartJetton: number ;

    firstUnlockTime: number;
    firstUnlockSize: number;
    cycleLength: number;
    cyclesNumber: number;

    jettonWalletAddress: Address;

    adminAddress: Address;
    ownerAddress: Address;
    content: Cell;
    sbtItemCode: Cell;
    jettonRootAddress: Address;
    nativeVaultAddress: Address;
    jettonVaultAddress: Address;
    purchaseConditions: Cell;
    commission_factors: Cell;
    
    minRefPurchase: bigint;
    defaultCashback: number;
    refs_dict: Cell;
    refWalletCode: Cell; 
};

export type IcoSaleContent = {

};


export function buildIcoSaleContentCell(data: IcoSaleContent): Cell {
    return Cell.EMPTY;
};

export function IcoSaleConfigToCell(config: IcoSaleConfig): Cell {
    return beginCell()
            .storeBit(0)

            .storeUint(config.saleStartTime, 32)
            .storeUint(config.saleEndTime, 32)
            
            .storeCoins(config.minTonCollected)
            .storeCoins(config.allocatedJettons)
            .storeUint(config.liquidityPartTon, 32)
            .storeUint(config.liquidityPartJetton, 32)

            .storeCoins(0)
            .storeCoins(0)

            .storeUint(config.firstUnlockTime, 32)
            .storeUint(config.firstUnlockSize, 16)
            .storeUint(config.cycleLength, 32)
            .storeUint(config.cyclesNumber, 16)
            
            .storeAddress(config.jettonWalletAddress)
            .storeBit(0)
            .storeBit(0)

            .storeRef(
                beginCell()
                    .storeAddress(config.adminAddress)
                    .storeAddress(config.ownerAddress)
                    .storeRef(config.content)
                    .storeRef(config.sbtItemCode)
                .endCell()
            ) 
            .storeRef( 
                beginCell()
                .storeAddress(config.jettonRootAddress)
                .storeAddress(config.nativeVaultAddress)
                .storeAddress(config.jettonVaultAddress)
                .storeRef(config.purchaseConditions)
                .storeRef(config.commission_factors)
                .endCell()
            ) 
            .storeRef( 
                beginCell()
                    .storeCoins(config.minRefPurchase)
                    .storeUint(config.defaultCashback, 32)
                    .storeMaybeRef(config.refs_dict)
                    .storeRef(config.refWalletCode)
                .endCell()
            ) 
        .endCell();
}

export class IcoSale implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new IcoSale(address);
    }

    static createFromConfig(config: IcoSaleConfig, code: Cell, workchain = 0) {
        const data = IcoSaleConfigToCell(config);
        const init = { code, data };
        return new IcoSale(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}