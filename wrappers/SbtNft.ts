import { MsgPrices } from 'ton';
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';
import { OpCodes } from './helpers/constants';

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
                .storeUint(config.firstUnlockSize, 16)
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
}
