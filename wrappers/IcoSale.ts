import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode } from 'ton-core';
import { CollectionMint, MintValue } from './helpers/collectionHelpers';
import { encodeOffChainContent } from './helpers/content';
import internal from 'stream';


export type NftCollectionConfig = {

};

export type NftCollectionContent = {
    collectionContent: string;
    commonContent: string;
};


export function buildNftCollectionContentCell(data: NftCollectionContent): Cell {
    let contentCell = beginCell();

    let collectionContent = encodeOffChainContent(data.collectionContent);

    let commonContent = beginCell();
    commonContent.storeStringTail(data.commonContent);

    contentCell.storeRef(collectionContent);
    contentCell.storeRef(commonContent);

    return contentCell.endCell();
}

export function nftCollectionConfigToCell(config: NftCollectionConfig): Cell {
    return beginCell()
    .endCell();
}

export class NftCollection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new NftCollection(address);
    }

    static createFromConfig(config: NftCollectionConfig, code: Cell, workchain = 0) {
        const data = nftCollectionConfigToCell(config);
        const init = { code, data };
        return new NftCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}