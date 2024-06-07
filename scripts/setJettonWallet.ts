import { Address, Cell, Dictionary, toNano } from 'ton-core';
import { SaleAdmin } from '../wrappers/SaleAdmin';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { PERCENT_DEVIDER } from '../wrappers/helpers/constants';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
    let nowSetting = Math.ceil(Date.now() / 1000)
    // const my_address = Address.parse("0QAz2fQ6CbjW9IhexJTMWvt6nQRVIIsfoNLGUmvRNLvUSbDD")
    // const my_address_2 = Address.parse("0QAWES8quo0uywd5s5-542nlg0tvuVzG17tHHjg3tDjWYdpU")
    const sale_admin = provider.open(SaleAdmin.createFromAddress(Address.parse("EQDM3SOv7l_wuxISGeeLatFoieyp5bDr0RdzPUDbQ_OdqV-W")));
    await sale_admin.sendChangeJettonWallet(provider.sender(), toNano("0.01"), Address.parse("kQBEv1WI8cDp-1-b_lbwkqWv9ime-wGcHxdCACn9VWt2oGI8"))
    // const jetton_wallet_address = provider.open(JettonWallet.createFromAddress(await jetton_root_address.getWalletAddress(provider.sender().address!!)))
    // const ico = provider.open(IcoSale.createFromAddress(Address.parse("kQCaKDpg-RmnG0i3GWr7jRUSaAFD5VT8C_jJUZ8D7IIWWKJm")))
    // // const wl_collection_address = Address.parse("kQBie8XPJtjfheZdjN0ZVVzTgWmX0RQfqIhSJAAouM70J0m2")
    // // const wlSbtCode = Cell.fromBase64("te6ccgECDgEAAdwAART/APSkE/S88sgLAQIBYgIDAgLOBAUACaEfn+AFAgEgBgcCASAMDQLPDIhxwCSXwPg0NMDAXGwkl8D4PpA+kAx+gAxcdch+gAx+gAwc6m0APACBLOOFDBsIjRSMscF8uGVAfpA1DAQI/AD4AbTH9M/ghBfzD0UUjC64wIwNDQ1NYIQL8smohK64wJfBIQX8vCAICQARPpEMHC68uFNgAqwyEDdeMkATUTXHBfLhkfpAIfAB+kDSADH6ACDXScIA8uLEggr68IAboSGUUxWgod4i1wsBwwAgkgahkTbiIML/8uGSIZQQKjdb4w0CkzAyNOMNVQLwAwoLAHJwghCLdxc1BcjL/1AEzxYQJIBAcIAQyMsFUAfPFlAF+gIVy2oSyx/LPyJus5RYzxcBkTLiAckB+wAAfIIQBRONkchQCc8WUAvPFnEkSRRURqBwgBDIywVQB88WUAX6AhXLahLLH8s/Im6zlFjPFwGRMuIByQH7ABBHAGom8AGCENUydtsQN0QAbXFwgBDIywVQB88WUAX6AhXLahLLH8s/Im6zlFjPFwGRMuIByQH7AAA7O1E0NM/+kAg10nCAJp/AfpA1DAQJBAj4DBwWW1tgAB0A8jLP1jPFgHPFszJ7VSA=")
    // // run methods on `saleAdmin`
    // await ico.sendSimpleBuy(provider.sender(), toNano(2))
    // await jetton_wallet_address.sendTransfer(provider.sender(), toNano("0.15"), toNano(1000), ico.address, provider.sender().address!!, null, toNano("0.1"), null)
}
