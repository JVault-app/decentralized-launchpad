import { MsgPrices } from 'ton';
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';
import { OpCodes } from './helpers/constants';
import { Maybe } from 'ton-core/dist/utils/maybe';

export type SftItemDataConfig = {
    index: bigint;
    collection_address: Address;
};

export function sftItemDataConfigToCell(config: SftItemDataConfig): Cell {
    return beginCell().storeUint(config.index, 256).storeAddress(config.collection_address).endCell();
}

export type SftItemMessageConfig = {
    queryId?: bigint;
    jettonsToPurchase: bigint;
    newCollectedTon: bigint;
    maxCollectedTon: bigint;
    buyerAddress: Address;
    firstUnlockTime: number;
    firstUnlockSize: number;
    cycleLength: number;
    cyclesNumber: number;
    refData: Cell;
}

export function SftItemMessageConfigToCell(config: SftItemMessageConfig): Cell {
    return beginCell()
                .storeUint(OpCodes.UPDATE_SBT_DATA, 32)
                .storeUint(config.queryId ?? 0, 64)
                .storeCoins(config.jettonsToPurchase)
                .storeCoins(config.newCollectedTon)
                .storeCoins(config.maxCollectedTon)
                .storeAddress(config.buyerAddress)
                .storeUint(config.firstUnlockTime, 32)
                .storeUint(config.firstUnlockSize, 32)
                .storeUint(config.cycleLength, 32)
                .storeUint(config.cyclesNumber, 16)
            .endCell();
}

export class SbtNft implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new SbtNft(address);
    }

    static createFromConfig(config: SftItemDataConfig, code: Cell, workchain = 0) {
        const data = sftItemDataConfigToCell(config);
        const init = { code, data };
        return new SbtNft(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, msgConfig: SftItemMessageConfig) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: SftItemMessageConfigToCell(msgConfig),
        });
    }

    async sendClaim(provider: ContractProvider, via: Sender, value: bigint, queryId: Maybe<number | bigint>) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.CLAIM, 32).storeUint(queryId ?? 0, 64).endCell(),
        });
    }

    async sendRequestRefund(provider: ContractProvider, via: Sender, value: bigint, queryId: Maybe<number | bigint>) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.REQUEST_REFUND, 32).storeUint(queryId ?? 0, 64).endCell(),
        });
    }

    async getWalletData(provider: ContractProvider) {
        let { stack } = await provider.get('get_wallet_data', []);
        return {
            balance: stack.readBigNumber(),
            owner: stack.readAddress(),
            minter: stack.readAddress(),
            wallet_code: stack.readCell()
        }
    }

    async getStorageData(provider: ContractProvider) {
        let { stack } = await provider.get('get_storage_data', []);
        return {
            index: stack.readNumber(),
            ico_address: stack.readAddress(),
            owner_address: stack.readAddress(),
            purchased_jettons: stack.readBigNumber(),
            collected_ton: stack.readBigNumber(),
            claimed_times: stack.readNumber(),
            claimed_jettons: stack.readBigNumber(),
            first_unlock_time: stack.readNumber(),
            first_unlock_size: stack.readNumber(),
            cycle_length: stack.readNumber(),
            cycles_number: stack.readNumber(),
            ref_data: stack.readCell(),
        }
    }
}
