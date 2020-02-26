/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Distribution of new transactions between nodes (taking into account the cache of received and sent transactions)
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass});

var glTxNum = 0;

//Engine context

function InitClass(Engine)
{
    Engine.ListTreeTx = {};
    Engine.AddCurrentProcessingTx = function (BlockNum,TxArr)
    {
        if(BlockNum < JINN_CONST.START_ADD_TX)
            return ;
        
        var Tree = Engine.ListTreeTx[BlockNum];
        if(!Tree)
        {
            Tree = new RBTree(FSortTx);
            Engine.ListTreeTx[BlockNum] = Tree;
        }
        
        for(var t = 0; t < TxArr.length; t++)
        {
            var Tx = TxArr[t];
            if(!Engine.IsValidateTx(Tx, "AddCurrentProcessingTx", BlockNum))
                continue;
            
            Engine.AddTxToTree(Tree, Tx);
        }
    };
    
    Engine.SendTx = function (BlockNum)
    {
        
        var ArrAll = Engine.GetTopTxArrayFromTree(Engine.ListTreeTx[BlockNum]);
        var TreeTT = Engine.GetTreeTicket(BlockNum);
        
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(!Child || !Child.IsHot() || Child.HotStart)
                continue;
            
            Child.SetLastCache(BlockNum);
            var ChildMap = Child.GetCacheByBlockNum(BlockNum);
            
            var Arr = [];
            for(var t = 0; t < ArrAll.length; t++)
            {
                var Tx = ArrAll[t];
                
                if(!Engine.IsValidateTx(Tx, "SendTx", BlockNum))
                    continue;
                if(global.glUseTicket)
                {
                    var TT = MapTT[Tx.KEY];
                    if(!TreeTT.find(Tx))
                    {
                        continue;
                    }
                    var TicketValue = ChildMap.ReceiveTicketMap[Tx.KEY];
                    if(TicketValue === global.OLD_TICKET)
                        continue;
                }
                
                if(!Engine.FindInCache(Child, BlockNum, Tx))
                {
                    Engine.AddTxToSendCache(Child, BlockNum, Tx);
                    Arr.push({Index:Tx.Index, body:Tx.body});
                    JINN_STAT.TxSend++;
                }
            }
            if(!Arr.length)
                continue;
            
            Engine.Send("TRANSFERTX", Child, {Cache:Child.CahcheVersion, BlockNum:BlockNum, TxArr:Arr});
        }
    };
    Engine.TRANSFERTX_SEND = {Cache:"uint", BlockNum:"uint", TxArr:[{Index:"uint16", body:"tr"}]};
    Engine.TRANSFERTX = function (Child,Data)
    {
        
        var TxArr = Data.TxArr;
        var BlockNum = Data.BlockNum;
        
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_TX))
        {
            Engine.ToError(Child, "TRANSFERTX : CanProcessBlock Error BlockNum=" + BlockNum, 3);
            return ;
        }
        
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot() || Child.HotStart)
            return ;
        
        Child.CheckCache(Data.Cache, BlockNum);
        
        Engine.CheckSizeTXArray(Child, TxArr);
        var TxArr2 = [];
        for(var t = 0; t < TxArr.length; t++)
        {
            var Value = TxArr[t];
            var Tx = Engine.GetTx(Value.body);
            Tx.Index = Value.Index;
            if(!Engine.IsValidateTx(Tx, "TRANSFERTX", BlockNum))
                continue;
            if(global.JINN_WARNING >= 5 && global.glUseTicket && BlockNum > JINN_CONST.START_CHECK_BLOCKNUM)
            {
                var Tree = Engine.ListTreeTx[BlockNum];
                if(Tree && Tree.find(Tx))
                {
                    Engine.ToLog("<-" + Child.ID + ". B=" + BlockNum + " Bad TICKET CHACHE - WAS Tx=" + Tx.name);
                }
            }
            
            Engine.AddTxToReceiveCache(Child, BlockNum, Tx, 1);
            TxArr2.push(Tx);
        }
        
        Engine.AddCurrentProcessingTx(BlockNum, TxArr2);
        
        Engine.SendTx(BlockNum);
    };
    Engine.SendTestMap = {};
    
    Engine.SendTest = function (Value)
    {
        if(Engine.SendTestMap[Value])
            return ;
        Engine.SendTestMap[Value] = 1;
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(!Child)
                continue;
            
            Engine.Send("TESTMESSAGE", Child, {Value:Value});
        }
    };
    Engine.TESTMESSAGE = function (Child,Data)
    {
        Engine.TestValue = Data.Value;
        Engine.SendTest(Data.Value);
        
        Engine.CheckHotConnection(Child);
    };
    Engine.FindInCache = function (Child,BlockNum,Tx)
    {
        if(!Child.TxMap)
            Child.TxMap = {};
        if(Child.TxMap[Tx.KEY] === undefined)
            return 0;
        else
            return 1;
    };
    
    Engine.AddTxToSendCache = function (Child,BlockNum,Tx)
    {
        if(!Child.TxMap)
            Child.TxMap = {};
        Child.TxMap[Tx.KEY] = 1;
        
        return 0;
    };
    Engine.AddTxToReceiveCache = function (Child,BlockNum,Tx,bCheck)
    {
        if(!Child.TxMap)
            Child.TxMap = {};
        Child.TxMap[Tx.KEY] = 1;
        return 0;
    };
    
    Engine.CreateTx = function (Params)
    {
        glTxNum++;
        var rnd = glTxNum;
        
        var body = [0];
        WriteUintToArr(body, Engine.ID);
        WriteUintToArr(body, rnd);
        for(var i = 0; i < 100; i++)
            body[body.length] = random(255);
        
        var nonce = 0;
        WriteUintToArr(body, Params.BlockNum);
        WriteUintToArr(body, nonce);
        var Tx = Engine.GetTx(body);
        
        return Tx;
    };
    
    Engine.GetTx = function (body,HASH,HashPow)
    {
        
        var Tx = {};
        Tx.IsTx = 1;
        Tx.num = ReadUintFromArr(body, body.length - 12);
        if(HASH)
            Tx.HASH = HASH;
        else
            Tx.HASH = sha3(body);
        
        Tx.HashTicket = Tx.HASH.slice(0, JINN_CONST.TX_TICKET_HASH_LENGTH);
        Tx.KEY = GetHexFromArr(Tx.HashTicket);
        Tx.body = body;
        if(HashPow)
        {
            Tx.HashPow = HashPow;
            Tx.TimePow = Engine.GetPowPower(HashPow);
        }
        else
        {
            Engine.FillTicket(Tx);
        }
        
        Tx.name = Tx.KEY.substr(0, 6) + "-" + Tx.TimePow;
        
        return Tx;
    };
}

function CheckTx(StrCheckName,Tx,BlockNum,bLog)
{
    if(!Tx || !Tx.KEY || Tx.TimePow === undefined || Tx.num !== BlockNum)
    {
        if(global.JINN_WARNING >= 2)
        {
            var Str = StrCheckName + " B=" + BlockNum + " TX=" + JSON.stringify(Tx);
            if(bLog)
                ToLog(Str);
            else
                ToLogTrace(Str);
        }
        
        return 0;
    }
    return 1;
}

var MapTT = {};
function CheckTicketKey(Tx)
{
    if(!global.JINN_WARNING)
        return ;
    
    if(MapTT[Tx.KEY])
    {
        ToLog("ERROR KEY TICKET:\nNEW:" + JSON.stringify(Tx) + "\nWAS:" + JSON.stringify(MapTT[Tx.KEY]));
    }
    MapTT[Tx.KEY] = Tx;
}

global.CheckTx = CheckTx;
