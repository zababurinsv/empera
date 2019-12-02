/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({Init:Init});
global.glUseTicket = 1;
global.FRESH_TIKET = "FRESH";
global.OLD_TICKET = "OLD";
function Init(Engine)
{
    Engine.ListTicket = {};
    Engine.InitTicket = function (BlockNum)
    {
        var MapCurTicket = Engine.ListTicket[BlockNum];
        if(!MapCurTicket)
        {
            MapCurTicket = {};
            Engine.ListTicket[BlockNum] = MapCurTicket;
        }
        var ArrTx = GetArrFromMap(Engine.ListTx[BlockNum]);
        for(var i = 0; i < ArrTx.length; i++)
        {
            var Tx = ArrTx[i];
            CheckTx("InitTicket", Tx, BlockNum, 1);
            MapCurTicket[Tx.KEY] = Tx;
        }
    };
    Engine.SendTicket = function (BlockNum)
    {
        var ArrAll = Engine.GetTopTxArray(Engine.ListTicket[BlockNum]);
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(!Child || Child.Del || !Child.Hot || Child.HotStart)
                continue;
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
            Engine.Send("TRANSFERTT", Child, {BlockNum:BlockNum, TxArr:Arr});
        }
    };
    Engine.TRANSFERTT_SEND = {BlockNum:"uint", TxArr:["arr" + JINN_CONST.TX_TICKET_HASH_LENGTH]};
    Engine.TRANSFERTT = function (Child,Data)
    {
        var TxArr = Data.TxArr;
        var BlockNum = Data.BlockNum;
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_TICKET))
        {
            Engine.ToError(Child, "TRANSFERTT : CanProcessBlock Error BlockNum=" + BlockNum);
            return ;
        }
        Engine.CheckHotConnection(Child);
        if(!Child || Child.Del || !Child.Hot || Child.HotStart)
            return ;
        var ChildMap = Child.GetCacheByBlockNum(BlockNum);
        var MapCurTicket = Engine.ListTicket[BlockNum];
        if(!MapCurTicket)
        {
            MapCurTicket = {};
            Engine.ListTicket[BlockNum] = MapCurTicket;
        }
        Engine.CheckSizeTXArray(TxArr);
        for(var t = 0; t < TxArr.length; t++)
        {
            var HashTicket = TxArr[t];
            var Key = GetHexFromArr(HashTicket);
            if(ChildMap.ReceiveTicketMap[Key] !== undefined)
                continue;
            if(MapCurTicket[Key])
            {
                ChildMap.ReceiveTicketMap[Key] = OLD_TICKET;
            }
            else
            {
                ChildMap.ReceiveTicketMap[Key] = FRESH_TIKET;
                MapCurTicket[Key] = Engine.GetTicket(HashTicket, Key, BlockNum);
                Engine.ToDebug("GET TICKET: " + Key + " from " + Child.ID);
            }
        }
        Engine.SendTicket(BlockNum);
    };
    Engine.GetTicket = function (HashTicket,Key,Num)
    {
        var Tx = {HashTicket:HashTicket, KEY:Key, num:Num};
        Engine.FillTicket(Tx);
        return Tx;
    };
    Engine.FillTicket = function (Tx)
    {
        var FullHashTicket = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for(var i = 0; i < JINN_CONST.TX_TICKET_HASH_LENGTH; i++)
            FullHashTicket[i] = Tx.HashTicket[i];
        WriteUintToArrOnPos(FullHashTicket, Tx.num, JINN_CONST.TX_TICKET_HASH_LENGTH);
        Tx.HashPow = sha3(FullHashTicket);
        Tx.TimePow = Engine.GetPowPower(Tx.HashPow);
    };
}
