/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
module.exports.Init = Init;

function Init(Engine)
{
    
    SERVER.CheckOnStartComplete = 1;
    
    SERVER.BlockNumDBMin = 0;
    Object.defineProperty(SERVER, "BlockNumDB", {set:function (x)
        {
        }, get:function (x)
        {
            return Engine.GetMaxNumBlockDB();
        }, });
    
    function GetBlockNumTx(arr)
    {
        var Delta_Time = 0;
        
        var BlockNum = GetCurrentBlockNumByTime(Delta_Time);
        if(arr[0] === TYPE_TRANSACTION_CREATE)
        {
            var BlockNum2 = Math.floor(BlockNum / 10) * 10;
            if(BlockNum2 < BlockNum)
                BlockNum2 = BlockNum2 + 10;
            BlockNum = BlockNum2;
        }
        
        return BlockNum;
    };
    
    SERVER.AddTransaction = function (Tx0)
    {
        var Body = Tx0.body;
        var BlockNum = GetBlockNumTx(Body);
        var Tx = Engine.GetTx(Body, BlockNum, undefined, 6);
        
        if(JINN_CONST.TX_CHECK_OPERATION_ID)
        {
            Engine.CheckTxOperationID(Tx, BlockNum);
            if(Tx.ErrOperationID)
                return TX_RESULT_OPERATIOON_ID;
        }
        
        if(JINN_CONST.TX_CHECK_SIGN_ON_ADD)
        {
            Engine.CheckTxSign(Tx, BlockNum);
            if(Tx.ErrSign)
                return TX_RESULT_SIGN;
        }
        
        if(!Engine.IsValidateTx(Tx, "ERROR SERVER.AddTransaction", BlockNum))
            return TX_RESULT_BAD_TYPE;
        
        Tx0._TxID = GetStrTxIDFromHash(Tx.HASH, BlockNum);
        Tx0._BlockNum = BlockNum;
        
        var TxArr = [Tx];
        var CountSend = Engine.AddCurrentProcessingTx(BlockNum, TxArr);
        if(CountSend === 1)
            return 1;
        else
            return TX_RESULT_WAS_SEND;
    };
    
    SERVER.CheckCreateTransactionObject = function (Tr,SetTxID,BlockNum)
    {
        var Body = Tr.body;
        Tr.IsTx = 1;
        if(SetTxID)
            Tr.TxID = GetHexFromArr(GetTxID(BlockNum, Body));
        Tr.power = 0;
        Tr.TimePow = 0;
    };
    
    Engine.GetTxSenderNum = function (Tx,BlockNum)
    {
        
        var type = Tx.body[0];
        var App = DAppByType[type];
        if(App)
            return App.GetSenderNum(BlockNum, Tx.body);
        else
            return 0;
    };
    
    Engine.GetTxSenderOperationID = function (Tx,BlockNum)
    {
        var OperationID;
        var type = Tx.body[0];
        var App = DAppByType[type];
        if(App)
            OperationID = App.GetSenderOperationID(BlockNum, Tx.body);
        else
            OperationID = 0;
        return OperationID;
    };
    
    Engine.GetAccountBaseValue = function (SenderNum)
    {
        if(!SenderNum)
            return 0;
        
        var AccData = DApps.Accounts.ReadState(SenderNum);
        if(!AccData || AccData.Currency !== 0)
            return 0;
        
        var RestData = DApps.Accounts.ReadRest(SenderNum);
        if(RestData)
        {
            var Value = RestData.Arr[1].Value;
            return Value.SumCOIN * 1e9 + Value.SumCENT;
        }
        else
            return 0;
    };
    
    Engine.GetAccountOperationID = function (SenderNum)
    {
        if(!SenderNum)
            return 0;
        
        var AccData = DApps.Accounts.ReadState(SenderNum);
        if(AccData)
            return AccData.Value.OperationID;
        else
            return 0;
    };
    
    Engine.CheckSignTx = function (Tx,BlockNum)
    {
        var type = Tx.body[0];
        var App = DAppByType[type];
        if(App)
            return App.CheckSignTransferTx(BlockNum, Tx.body);
        else
            return 0;
    };
    let CloseOld = SERVER.Close.bind(SERVER);
    SERVER.ClearDataBase = function ()
    {
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            global.TX_PROCESS.RunRPC("ClearDataBase", {});
        
        Engine.ClearDataBase();
    };
    SERVER.Close = function ()
    {
        CloseOld();
        Engine.Close();
    };
    
    SERVER.WriteBlockDB = function (Block)
    {
        Engine.ConvertFromTera(Block, 1);
        return Engine.SaveToDB(Block);
    };
    SERVER.WriteBlockHeaderDB = function (Block,bPreSave)
    {
        Engine.ConvertFromTera(Block);
        return Engine.SaveToDB(Block);
    };
    
    SERVER.ReadBlockDB = function (BlockNum)
    {
        var Block = Engine.GetBlockDB(BlockNum);
        Engine.ConvertToTera(Block, 1);
        return Block;
    };
    
    SERVER.CheckLoadBody = function (Block)
    {
        Engine.CheckLoadBody(Block);
        Engine.ConvertToTera(Block, 1);
    };
    
    SERVER.ReadBlockHeaderDB = function (BlockNum)
    {
        var Block = Engine.GetBlockHeaderDB(BlockNum);
        Engine.ConvertToTera(Block, 0);
        return Block;
    };
    SERVER.ReadBlockHeaderFromMapDB = SERVER.ReadBlockHeaderDB;
    
    SERVER.TruncateBlockDB = function (LastNum)
    {
        var Result = Engine.TruncateChain(LastNum);
        
        return Result;
    };
    
    SERVER.GetMaxNumBlockDB = function ()
    {
        return Engine.GetMaxNumBlockDB();
    };
    
    SERVER.FindStartBlockNum222 = function ()
    {
        return Engine.GetMaxNumBlockDB();
    };
    
    function ErrorAPICall()
    {
        ToLogTrace("Error API call");
        return 0;
    };
    
    function ErrorTODO()
    {
        ToLogTrace("TODO");
        return 0;
    };
    
    SERVER.WriteBlockDBFinaly = ErrorAPICall;
    SERVER.WriteBodyDB = ErrorAPICall;
    
    SERVER.WriteBodyResultDB = ErrorTODO;
    
    SERVER.CreateGenesisBlocks = function ()
    {
    };
    SERVER.CheckStartedBlocks = function ()
    {
        var CurNumTime = GetCurrentBlockNumByTime();
        if(SERVER.BlockNumDB > CurNumTime)
        {
            SERVER.TruncateBlockDB(CurNumTime);
        }
        var BlockNum = SERVER.CheckBlocksOnStartReverse(SERVER.BlockNumDB);
        BlockNum = BlockNum - 10000;
        if(BlockNum < 0)
            BlockNum = 0;
        ToLog("CheckStartedBlocks at " + BlockNum);
        BlockNum = SERVER.CheckBlocksOnStartFoward(BlockNum, 0);
        BlockNum = SERVER.CheckBlocksOnStartFoward(BlockNum - 100, 1);
        
        if(BlockNum < SERVER.BlockNumDB)
        {
            BlockNum--;
            ToLog("******************************** SET NEW BlockNumDB = " + BlockNum + "/" + SERVER.BlockNumDB);
            if(global.DEV_MODE)
                throw "STOP AND EXIT!";
            
            SERVER.TruncateBlockDB(BlockNum);
        }
        global.glStartStat = 1;
    };
    
    SERVER.GetLinkHash = ErrorAPICall;
    SERVER.GetLinkHashDB = ErrorAPICall;
    
    global.ON_USE_CONST = function ()
    {
        global.JINN_WARNING =  + global.LOG_LEVEL;
        
        if(global.WEB_PROCESS)
            global.WEB_PROCESS.UpdateConst = 1;
    };
    
    Engine.ChildIDCounter = 10000;
    Engine.SetChildID = function (Child)
    {
        Engine.ChildIDCounter++;
        Child.ID = Engine.ChildIDCounter;
    };
    
    SERVER.GetNodesArrWithAlive = function ()
    {
        var Arr = [];
        var it = Engine.NodesTree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            var Power = Engine.GetAddrPower(Item.AddrHashPOW, Item.BlockNum);
            if(Item.System)
                Power += global.MIN_POW_ADDRES;
            
            if(Power > global.MIN_POW_ADDRES)
            {
                Arr.push({ip:Item.ip, port:Item.ip, portweb:Item.portweb});
            }
        }
        return Arr;
    };
    SERVER.ConnectToAll = function ()
    {
        var Count = 0;
        
        var Map = {};
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(Child)
            {
                Map[Child.ID] = 1;
            }
        }
        
        var it = Engine.NodesTree.iterator(), AddrItem;
        while((AddrItem = it.next()) !== null)
        {
            if(Map[AddrItem.ID])
                continue;
            
            Engine.InitAddrItem(AddrItem);
            
            var Power = Engine.GetAddrPower(AddrItem.AddrHashPOW, AddrItem.BlockNum);
            if(AddrItem.System || global.MODELING)
                Power += MIN_POW_ADDRES;
            
            if(Power < global.MIN_POW_ADDRES / 2)
                continue;
            
            var Child = Engine.RetNewConnectByAddr(AddrItem);
            
            if(Engine.SendConnectReq(Child))
                Count++;
        }
        
        ToLog("Connect to " + Count + " nodes");
    };
    
    Object.defineProperty(SERVER, "ip", {get:function ()
        {
            return Engine.ip;
        }});
    Object.defineProperty(SERVER, "port", {get:function ()
        {
            return Engine.port;
        }});
    Engine.OnSetTimeDelta = function (DeltaTime)
    {
        SAVE_CONST(0);
    };
    Engine.OnSetOwnIP = function (ip)
    {
        global.JINN_IP = ip;
        SAVE_CONST(1);
    };
    
    ON_USE_CONST();
}
