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
        let res = await provider.get('get_jetton_data', []);
        return {
            totalSupply: res.stack.readBigNumber(),
            mintable: res.stack.readBoolean(),
            adminAddress: res.stack.readAddress(),
            content: res.stack.readCell(),
            walletCode: res.stack.readCell(),
        }
    }

    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [{ type: 'slice', cell: beginCell().storeAddress(owner).endCell() }])
        return res.stack.readAddress()
    }

    async getStorageData(provider: ContractProvider) {
        let res = await provider.get('get_storage_data', []);
        
        let collection_info = res.stack.readCell().asSlice();
        let internal_ds = res.stack.readCell().asSlice();

        return {
            init: res.stack.readNumber(),
            sale_start_time: res.stack.readNumber(),
            saleEndTime: res.stack.readNumber(),

            min_ton_collected: res.stack.readBigNumber(),
            allocated_jettons: res.stack.readBigNumber(),
            liquidity_part_ton: res.stack.readNumber(),
            liquidity_part_jetton: res.stack.readNumber(),

            ton_collected: res.stack.readBigNumber(),
            jettons_sold: res.stack.readBigNumber(),

            first_unlock_time: res.stack.readNumber(),
            first_unlock_size: res.stack.readNumber(),
            cycle_length: res.stack.readNumber(),
            cycles_number: res.stack.readNumber(),
            
            jetton_wallet_address: res.stack.readAddress(),
            jettons_added: res.stack.readNumber(),
            sale_finished: res.stack.readNumber(),

            admin_address: collection_info.loadAddress(),
            owner_address: collection_info.loadAddress(),
            content: collection_info.loadRef(),
            sbt_item_code: collection_info.loadRef(),

            jetton_root_address: internal_ds.loadAddress(),
            native_vault_address: internal_ds.loadAddress(),
            jetton_vault_address: internal_ds.loadAddress(),
            purchase_conditions: internal_ds.loadRef(),
            commission_factors: internal_ds.loadRef(),
            min_ref_purchase: internal_ds.loadCoins(),
            default_cashback: internal_ds.loadUint(32),
            refs_dict: internal_ds.loadMaybeRef(),
            ref_wallet_code: internal_ds.loadRef(),
        };
    }

}