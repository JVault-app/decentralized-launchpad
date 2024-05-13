export class OpCodes { 
    static GET_STORAGE_DATA       = 0x5B88E5CC; 
    static REPORT_STORAGE_DATA    = 0xAAB4A8EF; 
    static EXCESSES               = 0xD53276DB;
 
    static TRANSFER_JETTON         = 0xF8A7EA5; 
    static TRANSFER_NOTIFICATION   = 0x7362D09C; 
    static PROVIDE_WALLET_ADDRESS  = 0x2C76B973; 
    static TAKE_WALLET_ADDRESS     = 0xD1735400; 
    static BURN_JETTON             = 0x595F07BC;
 
    static CHANGE_OWNER            = 0x93B05B31; 
    static CHANGE_PURCHASE_INFO    = 0xA7DD3E8D; 
    static ADD_REF_ADDRESSES       = 0x7AE5C1CA; 
    static WITHDRAW_TON            = 0x37726BDB; 
    static WITHDRAW_JETTON         = 0x11C09682;
 
    static BUY_WL                  = 0x90612494;  
    static APPROVE_PURCHASE        = 0x9F48D36D; 
    static CANCEL_PURCHASE         = 0x7D1D7445;
 
    static TRANSFER                = 0x5FCC3D14; 
    static REQUEST_OWNER           = 0xD0C3BFEA; 
    static OWNER_INFO              = 0x0DD607E3; 
    static PROVE_OWNERSHIP         = 0x04DED148; 
    static OWNERSHIP_PROOF         = 0x0524C7AE; 
    static OWNERSHIP_PROOF_BOUNCED = 0xC18E86D2; 
    static DESTROY                 = 0x1F04537A; 
    static REVOKE                  = 0x6F89F5E3; 
    static TAKE_EXCESS             = 0xD136D3B3; 
    static GET_static_DATA         = 0x2FCB26A2; 
    static REPORT_static_DATA      = 0x8B771735; 
    static GET_ROYALTY_PARAMS      = 0x693D3950; 
    static REPORT_ROYALTY_PARAMS   = 0xA8CB00AD; 
    static CLAIM                   = 0xA769DE27; 
    static REQUEST_REFUND          = 0x1075D7A3; 
    static UPDATE_SBT_DATA         = 0xDCA3DA4C; 
    static END_SALE                = 0xCB81BC08;
 
    static UPDATE_REF_WALLET       = 0x940298FC; 
    static CLAIM_REF               = 0x1F7B4E41;
 
    static DEPLOY_ICO_SALE         = 0x16CCCA41; 
    static SEND_COMMISSIONS        = 0xB96ADAEA; 
    static SEND_ANY_MESSAGE        = 0x9EC1E14;
 
    static DEPOSIT_LIQUIDITY_NATIVE = 0xD55E4686; 
    static DEPOSIT_LIQUIDITY_JETTON = 0x40E108D6; 
    static LIQUIDITY_FULFILL        = 0xB9B68EF4; 
    static LIQUIDITY_REJECT         = 0x9364A426;
}