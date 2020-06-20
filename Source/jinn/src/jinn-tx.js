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
global.JINN_MODULES.push({InitClass:InitClass, Name:"Tx"});

var glTxNum = 0;

//Engine context

function InitClass(Engine)
{
    Engine.ListArrTx = {};
    
    Engine.GetArrTx = function (BlockNum)
    {
        var Arr = Engine.ListArrTx[BlockNum];
        if(!Arr)
        {
            Arr = [];
            Engine.ListArrTx[BlockNum] = Arr;
        }
        return Arr;
    };
    Engine.AddCurrentProcessingTx = function (BlockNum,TxArr)
    {
        if(BlockNum < JINN_CONST.START_ADD_TX)
            return 0;
        
        var ArrTxAll = Engine.GetArrTx(BlockNum);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        
        for(var t = 0; t < TxArr.length; t++)
        {
            var Tx = TxArr[t];
            if(!Engine.IsValidateTx(Tx, "AddCurrentProcessingTx", BlockNum))
                continue;
            
            var TxAdd = Engine.AddToTreeWithAll(TreeTTAll, Tx);
            if(TxAdd)
                ArrTxAll.push(TxAdd);
        }
        
        Engine.StepTaskTt[BlockNum] = 1;
        Engine.StepTaskTx[BlockNum] = 1;
        Engine.StepTaskMax[BlockNum] = 1;
        
        return 1;
    };
    
    Engine.SendTx = function (BlockNum)
    {
        
        var ArrTop = Engine.GetTopTxArray(Engine.GetArrTx(BlockNum), BlockNum, 1);
        
        var WasBreak = 0;
        var ArrChilds = Engine.GetTransferSession(BlockNum);
        for(var i = 0; i < ArrChilds.length; i++)
        {
            var Child = ArrChilds[i];
            if(!Child)
            {
                if(Child)
                    JINN_STAT.ErrTx1++;
                continue;
            }
            
            var Level = Child.Level;
            
            let TxArr = [];
            for(var t = 0; t < ArrTop.length; t++)
            {
                var Tx = ArrTop[t];
                
                if(!Engine.IsValidateTx(Tx, "SendTx", BlockNum))
                    continue;
                
                if(GetBit(Tx.TXSend, Level))
                    continue;
                if(GetBit(Tx.TXSend2, Level))
                    continue;
                
                if(GetBit(Tx.TTReceive, Level))
                {
                    TxArr.push({HashTicket:Tx.HashTicket, TxHolder:Tx});
                    Tx.TXSend2 = SetBit(Tx.TXSend2, Level);
                }
                else
                {
                    TxArr.push({HashTicket:Tx.HashTicket, body:Tx.body});
                    JINN_STAT.TxSend++;
                    Tx.TXSend = SetBit(Tx.TXSend, Level);
                }
                
                if(JINN_CONST.MAX_TRANSFER_TX && TxArr.length >= JINN_CONST.MAX_TRANSFER_TX)
                {
                    WasBreak = 1;
                    break;
                }
            }
            
            if(!TxArr.length)
                continue;
            
            Engine.Send("TRANSFERTX", Child, {BlockNum:BlockNum, TxArr:TxArr}, function (Child,Data)
            {
                if(Data && Data.ReqForLoad.length)
                {
                    var Level = Child.Level;
                    for(var i = 0; i < Data.ReqForLoad.length; i++)
                    {
                        var Num = Data.ReqForLoad[i];
                        var Tx = TxArr[Num];
                        if(Tx)
                        {
                            var Tx2 = Tx.TxHolder;
                            Tx2.TXSend = ResetBit(Tx2.TXSend, Level);
                            Tx2.TXSend2 = ResetBit(Tx2.TXSend2, Level);
                            Tx2.TTReceive = ResetBit(Tx2.TTReceive, Level);
                        }
                    }
                    Engine.StepTaskTx[BlockNum] = 1;
                }
            });
        }
        
        if(!WasBreak)
            Engine.StepTaskTx[BlockNum] = 0;
    };
    
    Engine.TRANSFERTX_SEND = {Reserve:"uint", BlockNum:"uint32", TxArr:[{HashTicket:"arr" + JINN_CONST.TX_TICKET_HASH_LENGTH, body:"tr"}]};
    Engine.TRANSFERTX_RET = {result:"byte", ReqForLoad:["uint16"]};
    Engine.TRANSFERTX = function (Child,Data)
    {
        if(!Data)
            return;
        
        var Level = Child.Level;
        var TxArr = Data.TxArr;
        var BlockNum = Data.BlockNum;
        
        if(!Engine.CanProcessBlock(BlockNum, JINN_CONST.STEP_TX))
        {
            Engine.ToError(Child, "TRANSFERTX : CanProcessBlock Error BlockNum=" + BlockNum, 4);
            return;
        }
        
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot())
        {
            JINN_STAT.ErrTx2++;
            return;
        }
        
        Engine.CheckSizeTransferTXArray(Child, TxArr);
        
        var ArrTxAll = Engine.GetArrTx(BlockNum);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        
        var ReqForLoad = [];
        var TxArr2 = [];
        var ErrCount = 0;
        var CountNew = 0;
        for(var t = 0; t < TxArr.length; t++)
        {
            
            var ItemReceive = TxArr[t];
            var Tx;
            var Find = TreeTTAll.find(ItemReceive);
            
            if(ItemReceive.body.length === 0)
            {
                if(Find)
                {
                    Find.TXReceive = SetBit(Find.TXReceive, Level);
                }
                else
                {
                    JINN_STAT.TxReceiveErr++;
                }
                
                if(!Find || !Find.IsTx)
                    ReqForLoad.push(t);
                continue;
            }
            
            JINN_STAT.TxReceive++;
            if(Find)
            {
                if(Find.IsTx)
                    Tx = Find;
                else
                {
                    Tx = Engine.GetTxFromReceiveBody(Find, ItemReceive.body, BlockNum, 1);
                    ArrTxAll.push(Tx);
                }
            }
            else
            {
                Tx = Engine.GetTx(ItemReceive.body, undefined, 1);
                Tx.FromLevel = Level;
                
                var TxAdd = Engine.AddToTreeWithAll(TreeTTAll, Tx);
                if(TxAdd)
                    ArrTxAll.push(TxAdd);
            }
            
            if(!Engine.IsValidateTx(Tx, "TRANSFERTX", BlockNum))
                return undefined;
            Tx.TXReceive = SetBit(Tx.TXReceive, Level);
            
            CountNew++;
            TxArr2.push(Tx);
        }
        
        if(CountNew)
        {
            Engine.StepTaskTt[BlockNum] = 1;
            Engine.StepTaskTx[BlockNum] = 1;
            Engine.StepTaskMax[BlockNum] = 1;
        }
        
        return {result:1, ReqForLoad:ReqForLoad};
    };
    
    Engine.GetTxFromReceiveBody = function (Tt,body,BlockNum,NumTx)
    {
        var TxRaw;
        
        TxRaw = Engine.GetTx(body, undefined, NumTx);
        if(!Engine.IsValidateTx(TxRaw, "GetTxFromReceiveBody", BlockNum))
            return undefined;
        if(!IsEqArr(Tt.HashTicket, TxRaw.HashTicket))
        {
            Engine.ToLog("B=" + BlockNum + " **************** Error ticket/tx KEY: " + Tt.KEY + " / " + TxRaw.KEY, 3);
            return undefined;
        }
        
        Engine.DoTxFromTicket(Tt, TxRaw);
        return Tt;
    };
    
    Engine.CreateTx = function (Params)
    {
        glTxNum++;
        
        var body = [0];
        WriteUintToArr(body, Engine.ID);
        WriteUintToArr(body, glTxNum);
        WriteUintToArr(body, Engine.TickNum);
        for(var i = 0; i < 100; i++)
            body[body.length] = random(255);
        
        var nonce = 0;
        WriteUintToArr(body, Params.BlockNum);
        WriteUintToArr(body, nonce);
        var Tx = Engine.GetTx(body, undefined, 9);
        
        return Tx;
    };
}

global.CheckTx = function (StrCheckName,Tx,BlockNum,bLog)
{
    if(!Tx || !Tx.HASH)
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

