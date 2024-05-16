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
    owner: Address
    content: Cell
    authority?: Maybe<Address>
}

export function SbtItemMessageConfigToCell(config: SbtItemMessageConfig): Cell {
    return beginCell()
                .storeAddress(config.owner)
                .storeRef(config.content)
                .storeAddress(config.authority)
            .endCell();
}

export class SbtSingle implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new SbtSingle(address);
    }

    static createFromConfig(config: SbtItemDataConfig, code: Cell, workchain = 0) {
        const data = sbtItemDataConfigToCell(config);
        const init = { code, data };
        return new SbtSingle(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, msgConfig: SbtItemMessageConfig) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: SbtItemMessageConfigToCell(msgConfig),
        });
    }

    async sendProofOwnership(provider: ContractProvider, via: Sender, value: bigint, args: {dest: Address, forwardPayload: Cell, withContent: boolean, queryId?: number | bigint}) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.PROVE_OWNERSHIP, 32).storeUint(args.queryId ?? 0, 64).storeAddress(args.dest).storeRef(args.forwardPayload).storeBit(args.withContent).endCell(),
        });
    }

    async sendBuyWl(provider: ContractProvider, via: Sender, value: bigint, args: {dest: Address, lvl: number, ref?: Maybe<Address>}) {
        return await this.sendProofOwnership(provider, via, value, {dest: args.dest, forwardPayload: beginCell().storeUint(args.lvl, 2).storeRef(beginCell().storeAddress(args.ref).endCell()).endCell(), withContent: false})
    }
}
