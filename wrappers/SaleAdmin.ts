import { Address, beginCell, Builder, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode } from 'ton-core';
import { OpCodes } from './helpers/constants';
import { IcoSaleConfig, IcoSaleConfigToCell } from './IcoSale';

export type RevenueShare = {
    address: Address,
    share: number
}

function sharesDictValueParser(): DictionaryValue<RevenueShare> {
    return {
        serialize: (src, buidler) => {
            buidler.storeAddress(src.address).storeUint(src.share, 32).endCell();
        },
        parse: (src) => {
            return {address: src.loadAddress(), share: src.loadUint(32)};
        }
    }
}

function coinsDictValueParser(): DictionaryValue<bigint> {
    return {
        serialize: (src, buidler) => {
            buidler.storeCoins(src).endCell();
        },
        parse: (src) => {
            return src.loadCoins()
        }
    }
}

export function storeRevenueShareList(src: RevenueShare[]) {
    return (builder: Builder) => {
        let dict: Dictionary<number, RevenueShare> = Dictionary.empty()
        for (let item in src) {
            dict.set(Number(item), src[item])
        }
        builder.storeRef(beginCell().storeDictDirect(dict, Dictionary.Keys.Uint(8), sharesDictValueParser()))
    };
}

export type SaleAdminConfig = {

    ownerAddress: Address;
    jettonWalletAddress?: Address;
    revenueShareAddresses: RevenueShare[];

    creationFees: Dictionary<bigint, bigint>;
    commissionFactors: Dictionary<bigint, number>;
    icoSaleCode: Cell;
    sbtItemCode: Cell;
    refWalletCode: Cell;
};

export function saleAdminConfigToCell(config: SaleAdminConfig): Cell {
    return beginCell()
                .storeAddress(config.ownerAddress)
                .storeAddress(config.jettonWalletAddress)
                .store(storeRevenueShareList(config.revenueShareAddresses))
                .storeRef(beginCell().storeDictDirect(config.creationFees, Dictionary.Keys.BigUint(128), coinsDictValueParser()))
                .storeRef(beginCell().storeDictDirect(config.commissionFactors, Dictionary.Keys.BigUint(128), Dictionary.Values.Uint(32)))
                .storeRef(
                    beginCell()
                        .storeRef(config.icoSaleCode)
                        .storeRef(config.sbtItemCode)
                        .storeRef(config.refWalletCode)
                    .endCell()
                )
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

    async sendChangeJettonWallet(provider: ContractProvider, via: Sender, value: bigint, jettonWallet: Address, queryId: number | bigint = 0) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.CHANGE_JETTON_WALLET, 32).storeUint(queryId, 64).storeAddress(jettonWallet).endCell()
        })
    }

    static createRequestSaleDeployMessage(conf: IcoSaleConfig) {
        return beginCell().storeUint(OpCodes.DEPLOY_ICO_SALE, 32).storeRef(IcoSaleConfigToCell(conf)).endCell()
    }

    async getStorageData(provider: ContractProvider) {
        let { stack } = await provider.get('get_storage_data', []);
        return {
            owner_address: stack.readAddress(),
            jetton_wallet_address: stack.readAddress(),
            revenue_share_addresses: stack.readCell(),
            creation_fees: stack.readCell(),
            commission_factors: stack.readCell(),
            ico_sale_code: stack.readCell(),
            sbt_item_code: stack.readCell(),
            ref_wallet_code: stack.readCell()
        }
    }
}
