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
    Engine.ListTreeTx = {};
    
    Engine.GetTreeTx = function (BlockNum)
    {
        var Tree = Engine.ListTreeTx[BlockNum];
        if(!Tree)
        {
            Tree = new RBTree(FSortTx);
            Engine.ListTreeTx[BlockNum] = Tree;
        }
        return Tree;
    };
    Engine.AddCurrentProcessingTx = function (BlockNum,TxArr)
    {
        if(BlockNum < JINN_CONST.START_ADD_TX)
            return 0;
        
        var Tree = Engine.GetTreeTx(BlockNum);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        var ArrTTAll = Engine.GetArrTicketAll(BlockNum);
        
        var TreeTT = Engine.GetTreeTicket(BlockNum);
        
        for(var t = 0; t < TxArr.length; t++)
        {
            var Tx = TxArr[t];
            if(!Engine.IsValidateTx(Tx, "AddCurrentProcessingTx", BlockNum))
                continue;
            
            Engine.AddToTreeWithAll(TreeTTAll, ArrTTAll, Tree, Tx);
            
            if(TreeTT.WasInit)
                Engine.AddTxToTree(TreeTT, Tx);
        }
        
        Engine.StepTaskTt[BlockNum] = 1;
        Engine.StepTaskTx[BlockNum] = 1;
        Engine.StepTaskMax[BlockNum] = 1;
        
        return 1;
    };
    
    Engine.SendTx = function (BlockNum)
    {
        if(JINN_CONST.TEST_NEW_TT_MODE)
            Engine.SendTx1(BlockNum);
        else
            Engine.SendTx0(BlockNum);
    };
    Engine.TRANSFERTX = function (Child,Data)
    {
        if(JINN_CONST.TEST_NEW_TT_MODE)
            Engine.TRANSFERTX1(Child, Data);
        else
            Engine.TRANSFERTX0(Child, Data);
    };
    
    Engine.SendTx1 = function (BlockNum)
    {
        
        var ArrTop = Engine.GetTopTxArrayFromTree(Engine.ListTreeTx[BlockNum], BlockNum, 1);
        
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
            
            var Arr = [];
            for(var t = 0; t < ArrTop.length; t++)
            {
                var Tx = ArrTop[t];
                
                if(!Engine.IsValidateTx(Tx, "SendTx", BlockNum))
                    continue;
                
                if(GetBit(Tx.TXSend, Child.Level))
                    continue;
                
                if(GetBit(Tx.TTReceive, Child.Level))
                    continue;
                Tx.TXSend = SetBit(Tx.TXSend, Child.Level);
                
                global.DEBUG_KEY && Tx.KEY === global.DEBUG_KEY && Child.ToLog("B=" + BlockNum + ":" + Engine.TickNum + " Send TX=" + Tx.KEY);
                Arr.push({TTIndex:0, HashTicket:Tx.HashTicket, body:Tx.body});
                JINN_STAT.TxSend++;
                
                if(JINN_CONST.MAX_TRANSFER_TX && Arr.length >= JINN_CONST.MAX_TRANSFER_TX)
                {
                    WasBreak = 1;
                    break;
                }
            }
            
            if(!Arr.length)
                continue;
            
            Engine.Send("TRANSFERTX", Child, {BlockNum:BlockNum, TxArr:Arr});
        }
        
        if(!WasBreak)
            Engine.StepTaskTx[BlockNum] = 0;
    };
    
    Engine.SendTx0 = function (BlockNum)
    {
        
        var ArrTop = Engine.GetTopTxArrayFromTree(Engine.ListTreeTx[BlockNum], BlockNum, 1);
        
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
            
            var Arr = [];
            for(var t = 0; t < ArrTop.length; t++)
            {
                var Tx = ArrTop[t];
                
                if(!Engine.IsValidateTx(Tx, "SendTx", BlockNum))
                    continue;
                if(!Tx.TTReceiveIndex)
                    continue;
                
                if(GetBit(Tx.TXSend, Child.Level))
                    continue;
                
                if(!GetBit(Tx.TXWait, Child.Level))
                {
                    continue;
                }
                Tx.TXSend = SetBit(Tx.TXSend, Child.Level);
                
                global.DEBUG_KEY && Tx.KEY === global.DEBUG_KEY && Child.ToLog("B=" + BlockNum + ":" + Engine.TickNum + " Send TX=" + Tx.KEY);
                var TTIndex = Tx.TTReceiveIndex[Child.Level];
                if(!TTIndex)
                {
                    continue;
                }
                
                Arr.push({TTIndex:TTIndex - 1, body:Tx.body});
                JINN_STAT.TxSend++;
                
                if(JINN_CONST.MAX_TRANSFER_TX && Arr.length >= JINN_CONST.MAX_TRANSFER_TX)
                {
                    WasBreak = 1;
                    break;
                }
            }
            
            if(!Arr.length)
                continue;
            
            Engine.Send("TRANSFERTX", Child, {BlockNum:BlockNum, TxArr:Arr});
        }
        
        if(!WasBreak)
            Engine.StepTaskTx[BlockNum] = 0;
    };
    
    Engine.TRANSFERTX_SEND = {Reserve:"uint", BlockNum:"uint32", TxArr:[{TTIndex:"uint16", HashTicket:"arr" + JINN_CONST.TX_TICKET_HASH_LENGTH,
            body:"tr"}]};
    Engine.TRANSFERTX1 = function (Child,Data)
    {
        if(!Data)
            return;
        
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
        
        var Tree = Engine.GetTreeTx(BlockNum);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        var ArrTTAll = Engine.GetArrTicketAll(BlockNum);
        
        var TxArr2 = [];
        var ErrCount = 0;
        var CountNew = 0;
        for(var t = 0; t < TxArr.length; t++)
        {
            JINN_STAT.TxReceive++;
            
            var ItemReceive = TxArr[t];
            
            var Tx;
            var Find = TreeTTAll.find(ItemReceive);
            if(!Find)
            {
                Tx = Engine.GetTx(ItemReceive.body, undefined, undefined, 1);
                Tx.FromLevel = Child.Level + 100;
            }
            else
            {
                if(Find.IsTx)
                    Tx = Find;
                else
                    Tx = Engine.GetTxFromReceiveBody(Find, ItemReceive.body, BlockNum, 1);
            }
            if(!Engine.IsValidateTx(Tx, "TRANSFERTX", BlockNum))
                return undefined;
            
            global.DEBUG_KEY && Tx.KEY === global.DEBUG_KEY && Child.ToLog("B=" + BlockNum + ":" + Engine.TickNum + " Got TX=" + Tx.KEY);
            if(global.glUseTicket && global.JINN_WARNING >= 4)
            {
                var FindTT = Tree.find(Tx);
                if(FindTT)
                {
                    ErrCount++;
                    Child.ToLog("B=" + BlockNum + " WAS TX = " + Tx.KEY + " IN CACHE, Find=" + FindTT.KEY + " TTSend=" + FindTT.TTSend + " TTReceive=" + FindTT.TTReceive + "  from " + FindTT.FromLevel);
                }
                else
                {
                }
            }
            Tx.TXReceive = SetBit(Tx.TXReceive, Child.Level);
            
            CountNew++;
            TxArr2.push(Tx);
        }
        
        if(ErrCount)
        {
            if(!Child.INFO_DATA)
                Child.INFO_DATA = {};
            if(!Child.INFO_DATA.TxReceiveErr)
                Child.INFO_DATA.TxReceiveErr = 0;
            
            JINN_STAT.TxReceiveErr += ErrCount;
            Child.INFO_DATA.TxReceiveErr += ErrCount;
        }
        
        Engine.AddCurrentProcessingTx(BlockNum, TxArr2);
        
        if(CountNew)
            Engine.StepTaskTx[BlockNum] = 1;
    };
    Engine.TRANSFERTX0 = function (Child,Data)
    {
        if(!Data)
            return;
        
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
        
        var Tree = Engine.GetTreeTx(BlockNum);
        var ArrTTAll = Engine.GetArrTicketAll(BlockNum);
        
        var TxArr2 = [];
        var ErrCount = 0;
        var CountNew = 0;
        for(var t = 0; t < TxArr.length; t++)
        {
            JINN_STAT.TxReceive++;
            
            var ItemReceive = TxArr[t];
            
            var Find = ArrTTAll[ItemReceive.TTIndex];
            if(!Find)
            {
                Child.ToError("Error tx index = " + ItemReceive.TTIndex, 3);
                continue;
            }
            var Tx;
            if(Find.IsTx)
                Tx = Find;
            else
                Tx = Engine.GetTxFromReceiveBody(Find, ItemReceive.body, BlockNum, 1);
            
            if(!Tx)
                continue;
            
            global.DEBUG_KEY && Tx.KEY === global.DEBUG_KEY && Child.ToLog("B=" + BlockNum + ":" + Engine.TickNum + " Got TX=" + Tx.KEY);
            Tx.TXReceive = SetBit(Tx.TXReceive, Child.Level);
            
            CountNew++;
            TxArr2.push(Tx);
        }
        
        if(ErrCount)
        {
            if(!Child.INFO_DATA)
                Child.INFO_DATA = {};
            if(!Child.INFO_DATA.TxReceiveErr)
                Child.INFO_DATA.TxReceiveErr = 0;
            
            JINN_STAT.TxReceiveErr += ErrCount;
            Child.INFO_DATA.TxReceiveErr += ErrCount;
        }
        
        Engine.AddCurrentProcessingTx(BlockNum, TxArr2);
        
        if(CountNew)
            Engine.StepTaskTx[BlockNum] = 1;
    };
    
    Engine.GetTxFromReceiveBody = function (Tt,body,BlockNum,NumTx)
    {
        var TxRaw;
        
        TxRaw = Engine.GetTx(body, undefined, MAX_ARR_32, NumTx);
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
        var Tx = Engine.GetTx(body, undefined, undefined, 9);
        
        return Tx;
    };
}

function CheckTx(StrCheckName,Tx,BlockNum,bLog)
{
    if(!Tx || !Tx.KEY || Tx.TimePow === undefined)
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
        return;
    
    if(MapTT[Tx.KEY])
    {
        ToLog("ERROR KEY TICKET:\nNEW:" + JSON.stringify(Tx) + "\nWAS:" + JSON.stringify(MapTT[Tx.KEY]));
    }
    MapTT[Tx.KEY] = Tx;
}

global.CheckTx = CheckTx;
