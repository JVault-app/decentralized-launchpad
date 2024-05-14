import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode, toNano } from 'ton-core';
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

    async getJettonData(provider: ContractProvider) {
        let { stack } = await provider.get('get_jetton_data', []);
        return {
            totalSupply: stack.readBigNumber(),
            mintable: stack.readBoolean(),
            adminAddress: stack.readAddress(),
            content: stack.readCell(),
            walletCode: stack.readCell(),
        }
    }

    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        let { stack } = await provider.get('get_wallet_address', [{ type: 'slice', cell: beginCell().storeAddress(owner).endCell() }])
        return stack.readAddress()
    }

    async getStorageData(provider: ContractProvider) {
        let { stack } = await provider.get('get_storage_data', []);

        return {
            init: stack.readNumber(),
            sale_start_time: stack.readNumber(),
            saleEndTime: stack.readNumber(),

            min_ton_collected: stack.readBigNumber(),
            allocated_jettons: stack.readBigNumber(),
            liquidity_part_ton: stack.readNumber(),
            liquidity_part_jetton: stack.readNumber(),

            ton_collected: stack.readBigNumber(),
            jettons_sold: stack.readBigNumber(),

            first_unlock_time: stack.readNumber(),
            first_unlock_size: stack.readNumber(),
            cycle_length: stack.readNumber(),
            cycles_number: stack.readNumber(),
            
            jetton_wallet_address: stack.readAddress(),
            jettons_added: stack.readNumber(),
            sale_finished: stack.readNumber(),

            admin_address: stack.readAddress(),
            owner_address: stack.readAddress(),
            content: stack.readCell(),
            sbt_item_code: stack.readCell(),

            jetton_root_address: stack.readAddress(),
            native_vault_address: stack.readAddress(),
            jetton_vault_address: stack.readAddress(),
            purchase_conditions: stack.readCell(),
            commission_factors: stack.readCell(),
            min_ref_purchase: stack.readBigNumber(),
            default_cashback: stack.readNumber(),
            refs_dict: stack.readCellOpt(),
            ref_wallet_code: stack.readCell(),
        };
    }

}