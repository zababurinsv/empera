/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Reduction of the traffic of transactions through the use of tickets - short hash from the transaction
 * Algorithm:
 * First phase of dispatch of the tickets, then the phase of the transaction
 * Sending tickets by condition:
 * 1) Haven't sent yet
 * 2) And either did not receive, or received but it was not a new ticket
 * When you receive a ticket, set the special. flag:
 * - NEW_TIKET when it is a new ticket for us (i.e. did not receive from other nodes)
 * - OLD_TICKET-already in the ticket array
 * Transactions are sent only when the value of the ticket flag is not equal to OLD_TICKET (i.e. sent when the value is empty or equal to NEW_TIKET)
 *
**/
global.DEBUG_KEY = "";

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Ticket"});

global.glUseTicket = 1;

global.NEW_TIKET = "NEW";
global.OLD_TICKET = "OLD";

//Engine context

function InitClass(Engine)
{
    Engine.ListTreeTicket = {};
    Engine.ListTreeTicketAll = {};
    Engine.ListArrTicketAll = {};
    
    Engine.GetTreeTicket = function (BlockNum)
    {
        var Tree = Engine.ListTreeTicket[BlockNum];
        if(!Tree)
        {
            Tree = new RBTree(FSortTx);
            Engine.ListTreeTicket[BlockNum] = Tree;
        }
        return Tree;
    };
    Engine.GetTreeTicketAll = function (BlockNum)
    {
        var Tree = Engine.ListTreeTicketAll[BlockNum];
        if(!Tree)
        {
            Tree = new RBTree(function (a,b)
            {
                return CompareArr(a.HashTicket, b.HashTicket);
            });
            Engine.ListTreeTicketAll[BlockNum] = Tree;
        }
        return Tree;
    };
    Engine.GetArrTicketAll = function (BlockNum)
    {
        var Arr = Engine.ListArrTicketAll[BlockNum];
        if(!Arr)
        {
            Arr = [];
            Engine.ListArrTicketAll[BlockNum] = Arr;
        }
        return Arr;
    };
    
    Engine.InitTicket = function (BlockNum)
    {
        var Tree = Engine.GetTreeTicket(BlockNum);
        if(Tree.WasInit)
            return;
        Tree.WasInit = 1;
        
        var ArrTx = Engine.GetArrayFromTree(Engine.ListTreeTx[BlockNum]);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        var ArrTTAll = Engine.GetArrTicketAll(BlockNum);
        
        for(var i = 0; i < ArrTx.length; i++)
        {
            var Tx = ArrTx[i];
            CheckTx("InitTicket", Tx, BlockNum, 1);
            
            Engine.AddToTreeWithAll(TreeTTAll, ArrTTAll, Tree, Tx);
        }
    };
    
    Engine.AddToTreeWithAll = function (TreeTTAll,ArrTTAll,Tree,Item)
    {
        Engine.AddTxToTree(Tree, Item);
        
        var Find = TreeTTAll.find(Item);
        
        if(Find)
        {
            if(Item.IsTx)
            {
                Engine.DoTxFromTicket(Find, Item);
            }
            if(!Find.TTReceiveIndex)
                ToLogTrace("************* Error !Find.TTReceiveIndex");
            return;
        }
        TreeTTAll.insert(Item);
        
        Item.TTIndex = ArrTTAll.length;
        ArrTTAll.push(Item);
        
        var ArrLength = 1 + Math.max(JINN_CONST.MAX_LEVEL_ALL(), Engine.LevelArr.length);
        if(Item.TTReceiveIndex)
            ToLog("WAS Item.TTReceiveIndex=" + Item.TTReceiveIndex);
        
        Item.TTReceiveIndex = new Uint16Array(ArrLength);
        Engine.InitItemTT(Item);
    };
    
    Engine.InitItemTT = function (Item)
    {
        Item.TTSend = 0;
        Item.TTReceive = 0;
        Item.TXWait = 0;
        
        Item.TXSend = 0;
        Item.TXReceive = 0;
    };
    
    Engine.SendTicket = function (BlockNum)
    {
        if(!glUseTicket)
            return;
        
        Engine.InitTicket(BlockNum);
        
        var ArrTop = Engine.GetArrayFromTree(Engine.ListTreeTicket[BlockNum]);
        
        var Count = 0;
        var ArrChilds = Engine.GetTransferSession(BlockNum);
        var WasBreak = 0;
        for(var i = 0; i < ArrChilds.length; i++)
        {
            var Child = ArrChilds[i];
            if(!Child)
            {
                if(Child)
                    JINN_STAT.ErrTt1++;
                continue;
            }
            
            let TTArr = [];
            for(var t = 0; t < ArrTop.length; t++)
            {
                var Tt = ArrTop[t];
                CheckTx("SendTicket", Tt, BlockNum, 1);
                
                if(!Tt.TTReceiveIndex)
                {
                    ToLog("Error - Not TTReceiveIndex, KEY=" + Tt.KEY);
                    continue;
                }
                
                if(GetBit(Tt.TTSend, Child.Level))
                {
                    continue;
                }
                
                if(JINN_CONST.TEST_NEW_TT_MODE)
                {
                    if(Tt.FromLevel === Child.Level)
                        continue;
                }
                else
                {
                    if(Tt.TTReceiveIndex[Child.Level])
                    {
                        continue;
                    }
                }
                
                global.DEBUG_KEY && Tt.KEY === DEBUG_KEY && Child.ToLog("B=" + BlockNum + ":" + Engine.TickNum + " Send TT=" + Tt.KEY + " TO Level=" + Child.Level + " TTSend=" + Tt.TTSend);
                
                TTArr.push(Tt);
                Tt.TTSend = SetBit(Tt.TTSend, Child.Level);
                
                JINN_STAT.TTSend++;
                Count++;
                
                if(JINN_CONST.MAX_TRANSFER_TX && TTArr.length >= JINN_CONST.MAX_TRANSFER_TX)
                {
                    WasBreak = 1;
                    break;
                }
            }
            
            if(!TTArr.length)
                continue;
            
            Engine.Send("TRANSFERTT", Child, {BlockNum:BlockNum, TtArr:TTArr}, function (Child,Data)
            {
                if(JINN_CONST.TEST_NEW_TT_MODE)
                    return;
                
                if(!Data || !Data.result)
                    return;
                
                if(!Engine.CanProcessBlock(BlockNum, JINN_CONST.STEP_TICKET))
                {
                    Engine.ToError(Child, "RET TRANSFERTT : CanProcessBlock Error BlockNum=" + BlockNum, 4);
                    return;
                }
                
                if(Data.ArrIndex.length !== TTArr.length)
                {
                    Child.ToError("Error length ArrIndex");
                    return;
                }
                for(var i = 0; i < TTArr.length; i++)
                {
                    var Tx = TTArr[i];
                    if(!Tx.TTReceiveIndex)
                    {
                        Child.ToError("Error TTReceiveIndex");
                        return;
                    }
                    
                    Tx.TTReceiveIndex[Child.Level] = 1 + Data.ArrIndex[i];
                }
                var ArrTTAll = Engine.GetArrTicketAll(BlockNum);
                
                for(var i = 0; i < Data.TxArr.length; i++)
                {
                    var TxIndex = Data.TxArr[i];
                    var Tt = ArrTTAll[TxIndex];
                    if(!Tt)
                    {
                        Child.ToError("Error ticket index = " + TxIndex);
                        break;
                    }
                    Tt.TXWait = SetBit(Tt.TXWait, Child.Level);
                }
            });
        }
        
        if(!WasBreak)
            Engine.StepTaskTt[BlockNum] = 0;
        
        return Count;
    };
    
    Engine.TRANSFERTT_SEND = {BlockNum:"uint32", TtArr:[{TTIndex:"uint16", HashTicket:"arr" + JINN_CONST.TX_TICKET_HASH_LENGTH}]};
    Engine.TRANSFERTT_RET = {result:"byte", ArrIndex:["uint16"], TxArr:["uint16"]};
    Engine.TRANSFERTT = function (Child,Data)
    {
        if(!Data)
            return;
        
        var BlockNum = Data.BlockNum;
        
        if(!Engine.CanProcessBlock(BlockNum, JINN_CONST.STEP_TICKET))
        {
            Engine.ToError(Child, "TRANSFERTT : CanProcessBlock Error BlockNum=" + BlockNum, 4);
            return {result:0};
        }
        
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot())
        {
            JINN_STAT.ErrTt2++;
            return {result:0};
        }
        
        var Tree = Engine.GetTreeTicket(BlockNum);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        var ArrTTAll = Engine.GetArrTicketAll(BlockNum);
        
        var TTArr = Data.TtArr;
        Engine.CheckSizeTransferTXArray(Child, TTArr);
        
        var RetArrIndex = [];
        var RetTxArr = [];
        
        var CountNew = 0;
        for(var t = 0; t < TTArr.length; t++)
        {
            JINN_STAT.TtReceive++;
            var ItemReceive = TTArr[t];
            var Tt = TreeTTAll.find(ItemReceive);
            if(!Tt)
            {
                CountNew++;
                var Key = GetHexFromArr(ItemReceive.HashTicket);
                Tt = Engine.GetTicket(ItemReceive.HashTicket, Key, BlockNum);
                
                Tt.FromLevel = Child.Level;
                Tt.TxCounter = 0;
                
                Key === global.DEBUG_KEY && Child.ToLog("B=" + BlockNum + ":" + Engine.TickNum + " Got NEW TT=" + Key);
                
                Engine.AddToTreeWithAll(TreeTTAll, ArrTTAll, Tree, Tt);
                RetTxArr.push(ItemReceive.TTIndex);
                Tt.TxCounter++;
            }
            else
            {
                var Key = GetHexFromArr(ItemReceive.HashTicket);
                Key === global.DEBUG_KEY && Child.ToLog("B=" + BlockNum + ":" + Engine.TickNum + " Got OLD TT=" + Key);
                
                if(Tt.TxCounter < JINN_CONST.TEST_MODE_DOUBLE_TX)
                {
                    RetTxArr.push(ItemReceive.TTIndex);
                    Tt.TxCounter++;
                }
            }
            
            RetArrIndex.push(Tt.TTIndex);
            Tt.TTReceive = SetBit(Tt.TTReceive, Child.Level);
            
            if(Tt.TTReceiveIndex)
            {
                Tt.TTReceiveIndex[Child.Level] = 1 + ItemReceive.TTIndex;
                if(!Tt.TTReceiveIndex[Child.Level])
                    ToLog("**********Error set TTReceiveIndex on " + Child.Level);
            }
        }
        
        if(CountNew)
        {
            Engine.StepTaskTt[BlockNum] = 1;
        }
        
        if(JINN_CONST.TEST_NEW_TT_MODE)
            return {result:1, ArrIndex:[], TxArr:[]};
        
        return {result:1, ArrIndex:RetArrIndex, TxArr:RetTxArr};
    };
}
