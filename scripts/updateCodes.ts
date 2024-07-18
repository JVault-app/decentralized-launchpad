import { Address, Cell, Dictionary, toNano } from 'ton-core';
import { SaleAdmin } from '../wrappers/SaleAdmin';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { PERCENT_DEVIDER } from '../wrappers/helpers/constants';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
    let nowSetting = Math.ceil(Date.now() / 1000)
    const sale_admin = provider.open(SaleAdmin.createFromAddress(Address.parse("EQAzuc-NxT4fyqzyfpD2lLEyhQJXoNaeP3UjrfMYKWOzW9vj")));
    // await sale_admin.sendChangeCodes(
    //     provider.sender(), 
    //     toNano("0.01"), 
    //     await compile("IcoSale"),
    //     await compile("SftItem"),
    //     await compile("RefWallet")
    // )
    await sale_admin.sendSetCode(provider.sender(), toNano("0.01"), await compile("SaleAdmin"));
}
