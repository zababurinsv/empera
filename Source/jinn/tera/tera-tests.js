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
}

module.exports.Init = Init;
function Init(Engine)
{
    if(!global.TEST_CONNECTOR)
        return;
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

function InitTestSha3()
{
    global.StatArrSha3 = [];
    if(global.oldsha3)
        return;
    
    global.oldsha3 = global.sha3;
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
global.InitTestSha3 = InitTestSha3;

if(0 && global.PROCESS_NAME === "MAIN")
    InitTestSha3();
