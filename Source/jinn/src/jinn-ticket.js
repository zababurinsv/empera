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
 * - FRESH_TIKET when it is a new ticket for us (i.e. did not receive from other nodes)
 * - OLD_TICKET-already in the ticket array
 * Transactions are sent only when the value of the ticket flag is not equal to OLD_TICKET (i.e. sent when the value is empty or equal to FRESH_TIKET)
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Ticket"});

global.glUseTicket = 1;

global.FRESH_TIKET = "FRESH";
global.OLD_TICKET = "OLD";

//Engine context

function InitClass(Engine)
{
    Engine.ListTreeTicket = {};
    
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
    
    Engine.InitTicket = function (BlockNum)
    {
        
        var Tree = Engine.GetTreeTicket(BlockNum);
        var ArrTx = Engine.GetTopTxArrayFromTree(Engine.ListTreeTx[BlockNum]);
        
        for(var i = 0; i < ArrTx.length; i++)
        {
            var Tx = ArrTx[i];
            CheckTx("InitTicket", Tx, BlockNum, 1);
            
            Engine.AddTxToTree(Tree, Tx);
        }
    };
    
    Engine.SendTicket = function (BlockNum)
    {
        
        var ArrAll = Engine.GetTopTxArrayFromTree(Engine.ListTreeTicket[BlockNum]);
        
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(!Child || !Child.IsHot() || !Child.IsOpen() || Child.HotStart)
                continue;
            
            Child.SetLastCache(BlockNum);
            var ChildMap = Child.GetCacheByBlockNum(BlockNum);
            
            var Arr = [];
            for(var t = 0; t < ArrAll.length; t++)
            {
                
                var Tt = ArrAll[t];
                CheckTx("SendTicket", Tt, BlockNum, 1);
                
                if(ChildMap.ReceiveTicketMap[Tt.KEY] !== FRESH_TIKET && ChildMap.SendTicketMap[Tt.KEY] === undefined)
                {
                    Arr.push(Tt.HashTicket);
                    
                    ChildMap.SendTicketMap[Tt.KEY] = 1;
                    
                    JINN_STAT.TTSend++;
                }
            }
            if(!Arr.length)
                continue;
            
            Engine.Send("TRANSFERTT", Child, {Cache:Child.CahcheVersion, BlockNum:BlockNum, TxArr:Arr});
        }
    };
    Engine.TRANSFERTT_SEND = {Cache:"uint", BlockNum:"uint32", TxArr:["arr" + JINN_CONST.TX_TICKET_HASH_LENGTH]};
    Engine.TRANSFERTT = function (Child,Data)
    {
        
        var TxArr = Data.TxArr;
        var BlockNum = Data.BlockNum;
        
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_TICKET))
        {
            Engine.ToError(Child, "TRANSFERTT : CanProcessBlock Error BlockNum=" + BlockNum, 3);
            return ;
        }
        
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot() || Child.HotStart)
            return ;
        
        Child.CheckCache(Data.Cache, BlockNum);
        var ChildMap = Child.GetCacheByBlockNum(BlockNum);
        var Tree = Engine.GetTreeTicket(BlockNum);
        
        Engine.CheckSizeTXArray(Child, TxArr);
        
        for(var t = 0; t < TxArr.length; t++)
        {
            var HashTicket = TxArr[t];
            var Key = GetHexFromArr(HashTicket);
            
            if(ChildMap.ReceiveTicketMap[Key] !== undefined)
                continue;
            
            var Tt = Engine.GetTicket(HashTicket, Key, BlockNum);
            if(Tree.find(Tt))
            {
                ChildMap.ReceiveTicketMap[Key] = OLD_TICKET;
            }
            else
            {
                ChildMap.ReceiveTicketMap[Key] = FRESH_TIKET;
                Engine.AddTxToTree(Tree, Tt);
            }
        }
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime() - JINN_CONST.STEP_TICKET;
        if(BlockNum !== CurBlockNum)
        {
            Engine.SendTicket(BlockNum);
        }
    };
    
    Engine.GetTicket = function (HashTicket,Key,Num)
    {
        var Tx = {HashTicket:HashTicket, KEY:Key, num:Num};
        Engine.FillTicket(Tx);
        return Tx;
    };
}
