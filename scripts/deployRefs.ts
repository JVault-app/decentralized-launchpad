import { Address, Cell, Dictionary, toNano } from 'ton-core';
import { IcoSale, RefsDictValue } from '../wrappers/IcoSale';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { PERCENT_DEVIDER } from '../wrappers/helpers/constants';

export async function run(provider: NetworkProvider) {
    const sale = provider.open(IcoSale.createFromAddress(Address.parse("EQCW0ebL3pQyM95vnZhJFDkFcjztrIzX0-6XX9LWd4nJiX1D")));
    await sale.sendDeployRefs(provider.sender(), toNano("1.15"))
}