import { Address, beginCell, Builder, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryKey, DictionaryValue, Sender, SendMode, toNano } from 'ton-core';
import { OpCodes } from "./helpers/constants"
import { Maybe } from 'ton-core/dist/utils/maybe';


export type PurchaseConditionsWhitelist = {
    priceFactor: bigint
    priceDevider: bigint
    minPurchaseTon: bigint
    maxPurchaseTon: bigint
    wlCollectionAddress: Address
    wlSbtCode: Cell
}

export type PurchaseConditionsRoot = {
    priceFactor: bigint
    priceDevider: bigint
    minPurchaseTon: bigint
    maxPurchaseTon: bigint
    wlCondition1?: Maybe<PurchaseConditionsWhitelist>
    wlCondition2?: Maybe<PurchaseConditionsWhitelist>
    wlCondition3?: Maybe<PurchaseConditionsWhitelist>
    wlCondition4?: Maybe<PurchaseConditionsWhitelist>
}

export function storePurchaseConditionsWhitelist(src: PurchaseConditionsWhitelist) {
    return (builder: Builder) => {
        builder.storeAddress(src.wlCollectionAddress).storeUint(src.priceFactor, 128).storeUint(src.priceDevider, 128).storeCoins(src.minPurchaseTon).storeCoins(src.maxPurchaseTon).storeRef(src.wlSbtCode)
    };
}

export function storeMaybePurchaseConditionsWhitelist(src: Maybe<PurchaseConditionsWhitelist>) {
    return (builder: Builder) => {
        if (src) {
            builder.storeRef(beginCell().store(storePurchaseConditionsWhitelist(src)).endCell())
        }
    };
}

export function storePurchaseConditionsRoot(src: PurchaseConditionsRoot) {
    return (builder: Builder) => {
        builder.storeUint(src.priceFactor, 128)
                .storeUint(src.priceDevider, 128)
                .storeCoins(src.minPurchaseTon)
                .storeCoins(src.maxPurchaseTon)
                .store(storeMaybePurchaseConditionsWhitelist(src.wlCondition1))
                .store(storeMaybePurchaseConditionsWhitelist(src.wlCondition2))
                .store(storeMaybePurchaseConditionsWhitelist(src.wlCondition3))
                .store(storeMaybePurchaseConditionsWhitelist(src.wlCondition4))
    };
}

export type RefsDictValue = {
    cashbackFactor: number
    discountFactor: number
}

function RefsDictValueParser(): DictionaryValue<RefsDictValue> {
    return {
        serialize: (src, buidler) => {
            buidler.storeUint(src.cashbackFactor, 32).storeUint(src.discountFactor, 32).endCell();
        },
        parse: (src) => {
            return {cashbackFactor: src.loadUint(32), discountFactor: src.loadUint(32)};
        }
    }
}

function AddressHashParser(): DictionaryKey<Address> {
    return {
        bits: 256,
        serialize: (src) => {
            return BigInt(`0x${src.hash.toString("hex")}`);
        },
        parse: (src) => {
            return Address.parseRaw(`0:${src.toString(16)}`);
        }
    }
}

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

    jettonWalletAddress?: Address;

    adminAddress: Address;
    ownerAddress: Address;
    content: Cell;
    sbtItemCode: Cell;

    jettonRootAddress: Address;
    nativeVaultAddress: Address;
    jettonVaultAddress: Address;
    purchaseConditions: PurchaseConditionsRoot;
    commission_factors: Dictionary<bigint, number>;

    minRefPurchase: bigint;
    defaultCashback: number;
    refsDict: Dictionary<Address, RefsDictValue>;
    refWalletCode: Cell; 
    changeInvitee: boolean;
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
            .storeUint(config.firstUnlockSize, 32)
            .storeUint(config.cycleLength, 32)
            .storeUint(config.cyclesNumber, 16)
            
            .storeAddress(config.jettonWalletAddress)
            .storeBit(false)
            .storeBit(false)
            .storeBit(config.changeInvitee)

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
                    .storeRef(beginCell().store(storePurchaseConditionsRoot(config.purchaseConditions)).endCell())
                    .storeDict(config.commission_factors, Dictionary.Keys.BigUint(128), Dictionary.Values.Uint(32))
                    .storeCoins(config.minRefPurchase)
                    .storeUint(config.defaultCashback, 32)
                    .storeDict(config.refsDict, AddressHashParser(), RefsDictValueParser())
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
            body: Cell.EMPTY,
        });
    }

    async sendSimpleBuy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Cell.EMPTY,
        });
    }

    async sendBuyRef(provider: ContractProvider, via: Sender, value: bigint, ref: Maybe<Address>) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeMaybeRef(ref ? beginCell().storeAddress(ref).endCell() : null).endCell(),
        });
    }

    async sendOwnershipProof(provider: ContractProvider, via: Sender, value: bigint) {

    }

    static createEndSellMessage() {
        return beginCell().storeUint(OpCodes.END_SALE, 32).endCell()
    }

    async sendEndSell(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: IcoSale.createEndSellMessage(),
        });
    }

    static createChangeOwnerMessage(args: {owner: Address, queryId?: number | bigint}) {
        return beginCell().storeUint(OpCodes.CHANGE_OWNER, 32).storeUint(args.queryId ?? 0, 64).storeAddress(args.owner).endCell()
    }

    async sendChangeOwner(provider: ContractProvider, via: Sender, value: bigint, args: {owner: Address, queryId?: number | bigint}) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: IcoSale.createChangeOwnerMessage(args),
        });
    }

    static createChangePurchaseInfoMessage(args: {purchase: PurchaseConditionsRoot, queryId?: number | bigint}) {
        return beginCell().storeUint(OpCodes.CHANGE_PURCHASE_INFO, 32).storeUint(args.queryId ?? 0, 64).storeRef(beginCell().store(storePurchaseConditionsRoot(args.purchase)).endCell()).endCell()
    }

    async sendChangePurchaseInfo(provider: ContractProvider, via: Sender, value: bigint, args: {purchase: PurchaseConditionsRoot, queryId?: number | bigint}) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: IcoSale.createChangePurchaseInfoMessage(args),
        });
    }

    static createAddRefAddressesMessage(args: {refs: Dictionary<Address, RefsDictValue>, queryId?: number | bigint}) {
        return beginCell().storeUint(OpCodes.ADD_REF_ADDRESSES, 32).storeUint(args.queryId ?? 0, 64).storeDict(args.refs, AddressHashParser(), RefsDictValueParser()).endCell()
    }

    async sendAddRefAddresses(provider: ContractProvider, via: Sender, value: bigint, args: {refs: Dictionary<Address, RefsDictValue>, queryId?: number | bigint}) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: IcoSale.createAddRefAddressesMessage(args),
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
            init: stack.readBoolean(),

            admin_address: stack.readAddress(),
            owner_address: stack.readAddress(),
            content: stack.readCell(),
            sbt_item_code: stack.readCell(),

            purchase_conditions: stack.readCell(),
            commission_factors: stack.readCell(),

            default_cashback: stack.readNumber(),

            min_ref_purchase: stack.readBigNumber(),
            refs_dict: stack.readCellOpt(),
            ref_wallet_code: stack.readCell(),

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

            jetton_root_address: stack.readAddress(),
            native_vault_address: stack.readAddress(),
            jetton_vault_address: stack.readAddress(),

            jetton_wallet_address: stack.readAddressOpt(),
            jettons_added: stack.readBoolean(),
            sale_finished: stack.readBoolean(),
            change_invitee: stack.readBoolean(),
            jettons_for_sale: stack.readBigNumber()
        };
    }

}