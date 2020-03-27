/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';

global.SendTestCoin = SendTestCoin;
function SendTestCoin(FRomId,ToID,Sum,Count,Mode)
{
    var PrivHex = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    if(WALLET && WALLET.WalletOpen === true)
    {
        PrivHex = WALLET.KeyPair.getPrivateKey('hex');
    }
    
    var Params = {"FromID":FRomId, "FromPrivKey":PrivHex, "ToID":ToID, "Amount":Sum, "Description":"Тест", "Confirm":0};
    
    var BlockNum = 2 + global.DELTA_FOR_TIME_TX + GetCurrentBlockNumByTime();
    
    var WasSend = 0;
    if(!Mode)
    {
        for(var i = 0; i < Count; i++)
        {
            var Res = WebApi2.Send(Params, 0, 0, 0, 2);
            var Body = Res.Body;
            if(Res.result)
            {
                var Res2 = SERVER.AddTransaction({body:Body}, 1);
                if(Res2 ===  - 3)
                    global.DELTA_FOR_TIME_TX++;
                if(Res2 === 1)
                    WasSend++;
            }
        }
        return WasSend;
    }
    else
        if(Mode === 1)
        {
            var Res = WebApi2.Send(Params, 0, 0, 0, 1);
            if(Res.result)
            {
                var TR = Res.Tx;
                for(var i = 0; i < Count; i++)
                {
                    TR.Body = [i];
                    TR.Sign = DApps.Accounts.GetSignTransferTx(TR, GetArrFromHex(Params.FromPrivKey));
                    var Body = BufLib.GetBufferFromObject(TR, FORMAT_MONEY_TRANSFER3, 140, {}, 1);
                    Body = Body.slice(0, Body.len + 12);
                    CreateHashBodyPOWInnerMinPower(TR, Body, undefined, 0);
                    
                    var Res2 = SERVER.AddTransaction({body:Body}, 1);
                    if(Res2 ===  - 3)
                        global.DELTA_FOR_TIME_TX++;
                    if(Res2 === 1)
                        WasSend++;
                }
            }
            return WasSend;
        }
        else
            if(Mode === 2)
            {
                for(var i = 0; i < Count; i++)
                {
                    var Body = Buffer.alloc(120);
                    var TX = {body:Body};
                    TX.body.writeUIntLE(BlockNum, TX.body.length - 12, 6);
                    TX.body.writeUIntLE(i, TX.body.length - 6, 6);
                    TX.body.writeUIntLE(i, 0, 6);
                    
                    var Res2 = SERVER.AddTransaction(TX, (i === 10));
                    if(Res2 ===  - 3)
                    {
                        global.DELTA_FOR_TIME_TX++;
                        break;
                    }
                    else
                        if(Res2 === 1)
                            WasSend++;
                }
                return WasSend;
            }
            else
                if(Mode === 3)
                {
                    var Res = WebApi2.Send(Params, 0, 0, 0, 2);
                    if(!Res.result)
                        return Res;
                    var Body0 = Buffer.concat([Buffer.from(Res.Body), Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
                    for(var i = 0; i < Count; i++)
                    {
                        var Body = Buffer.from(Body0);
                        Body.writeUIntLE(i, Body.length - 20, 6);
                        
                        CreateHashBodyPOWInnerMinPower({}, Body, undefined, 0);
                        
                        var Res2 = SERVER.AddTransaction({body:Body});
                        if(Res2 ===  - 3)
                        {
                            global.DELTA_FOR_TIME_TX++;
                            break;
                        }
                        else
                            if(Res2 === 1)
                            {
                                WasSend++;
                            }
                    }
                    return WasSend;
                }
}

module.exports.Init = Init;
function Init(Engine)
{
    if(!global.TEST_CONNECTOR)
        return ;
    Engine.SendGetNodesReq = function (Child)
    {
    };
    
    Engine.AddNodeAddrOld = Engine.AddNodeAddr;
    Engine.AddNodeAddr = function ()
    {
        Engine.AddNodeAddrOld({ip:"test.ru", port:33004});
    };
    Engine.UseExtraSlot = 1;
}

if(0 && global.PROCESS_NAME === "MAIN")
{
    
    var oldsha3 = global.sha3;
    global.StatArrSha3 = [];
    global.sha3 = function (data,num)
    {
        JINN_STAT.TestStat0++;
        
        if(num === undefined)
            num = 50;
        
        if(!StatArrSha3[num])
            StatArrSha3[num] = 0;
        StatArrSha3[num]++;
        
        return oldsha3(data);
    };
}
