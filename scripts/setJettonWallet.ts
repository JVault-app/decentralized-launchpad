import { Address, Cell, Dictionary, toNano } from 'ton-core';
import { SaleAdmin } from '../wrappers/SaleAdmin';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { PERCENT_DEVIDER } from '../wrappers/helpers/constants';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
    let nowSetting = Math.ceil(Date.now() / 1000)
    const sale_admin = provider.open(SaleAdmin.createFromAddress(Address.parse("kQDVtf4rQ-c9OGZrsF0fIey5zU1tPoOs-iWvAc7AilUmvjQq")));
    await sale_admin.sendChangeJettonWallet(provider.sender(), toNano("0.01"), Address.parse("kQBU_ZVFRckMLhCDkwkfol04UhSBvpl-Hfz6IxwwxoxRIonp"))
}
