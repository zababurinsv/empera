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
    
    global.ON_USE_CONST = function ()
    {
        global.JINN_WARNING =  + global.LOG_LEVEL;
        
        if(global.WEB_PROCESS)
            global.WEB_PROCESS.UpdateConst = 1;
    };
    SERVER.DO_CONSTANT = function ()
    {
        ON_USE_CONST();
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
