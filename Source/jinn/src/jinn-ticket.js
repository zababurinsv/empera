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
    Engine.ListTreeTicketAll = {};
    
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
    
    Engine.InitItemTT = function (Item)
    {
        Item.TTSend = 0;
        Item.TTReceive = 0;
        
        Item.TXSend = 0;
        Item.TXReceive = 0;
        Item.TXSend2 = 0;
    };
    
    Engine.AddToTreeWithAll = function (Tree,Item)
    {
        
        var Find = Tree.find(Item);
        if(Find)
        {
            if(Item.IsTx && !Find.IsTx)
            {
                Engine.DoTxFromTicket(Find, Item);
                
                return Find;
            }
            
            return 0;
        }
        Tree.insert(Item);
        Engine.InitItemTT(Item);
        
        return Item;
    };
    
    Engine.SendTicket = function (BlockNum)
    {
        if(!glUseTicket)
            return;
        
        var ArrTop = Engine.GetArrayFromTree(Engine.GetTreeTicketAll(BlockNum));
        
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
            
            var Level = Child.Level;
            var TTArr = [];
            for(var t = 0; t < ArrTop.length; t++)
            {
                var Tt = ArrTop[t];
                
                if(GetBit(Tt.TTSend, Level))
                {
                    continue;
                }
                
                if(Tt.FromLevel === Level)
                    continue;
                
                global.DEBUG_KEY && Tt.KEY === DEBUG_KEY && Child.ToLog("B=" + BlockNum + ":" + Engine.TickNum + " Send TT=" + Tt.KEY + " TO Level=" + Level + " TTSend=" + Tt.TTSend);
                
                TTArr.push(Tt);
                Tt.TTSend = SetBit(Tt.TTSend, Level);
                
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
            
            Engine.Send("TRANSFERTT", Child, {BlockNum:BlockNum, TtArr:TTArr});
        }
        
        if(!WasBreak)
            Engine.StepTaskTt[BlockNum] = 0;
        
        return Count;
    };
    
    Engine.TRANSFERTT_SEND = {BlockNum:"uint32", TtArr:[{HashTicket:"arr" + JINN_CONST.TX_TICKET_HASH_LENGTH}]};
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
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        
        var TTArr = Data.TtArr;
        Engine.CheckSizeTransferTXArray(Child, TTArr);
        var Level = Child.Level;
        
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
                
                Tt.FromLevel = Level;
                
                Key === global.DEBUG_KEY && Child.ToLog("B=" + BlockNum + ":" + Engine.TickNum + " Got NEW TT=" + Key);
                
                Engine.AddToTreeWithAll(TreeTTAll, Tt);
            }
            else
            {
            }
            Tt.TTReceive = SetBit(Tt.TTReceive, Level);
        }
        
        if(CountNew)
        {
            Engine.StepTaskTt[BlockNum] = 1;
        }
    };
}
