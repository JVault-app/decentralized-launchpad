import { MsgPrices } from 'ton';
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';
import { OpCodes } from './helpers/constants';
import { Maybe } from 'ton-core/dist/utils/maybe';

export type SbtItemDataConfig = {
    index: bigint;
    collection_address: Address;
};

export function sbtItemDataConfigToCell(config: SbtItemDataConfig): Cell {
    return beginCell().storeUint(config.index, 256).storeAddress(config.collection_address).endCell();
}

export type SbtItemMessageConfig = {
    queryId?: bigint;
    jettonsToPurchase: bigint;
    newCollectedTon: bigint;
    maxCollectedTon: bigint;
    firstUnlockTime: number;
    firstUnlockSize: number;
    cycleLength: number;
    cyclesNumber: number;
    refData: Cell;
}

export function SbtItemMessageConfigToCell(config: SbtItemMessageConfig): Cell {
    return beginCell()
                .storeUint(OpCodes.UPDATE_SBT_DATA, 32)
                .storeUint(config.queryId ?? 0, 64)
                .storeCoins(config.jettonsToPurchase)
                .storeCoins(config.newCollectedTon)
                .storeCoins(config.maxCollectedTon)
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

    static createFromConfig(config: SbtItemDataConfig, code: Cell, workchain = 0) {
        const data = sbtItemDataConfigToCell(config);
        const init = { code, data };
        return new SbtNft(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, msgConfig: SbtItemMessageConfig) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: SbtItemMessageConfigToCell(msgConfig),
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
