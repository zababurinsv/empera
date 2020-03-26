/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * Nodes that the current user communicates with
 * Initializing values
 *
**/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Item"});

var glChildWorkNum = 0;

function InitClass(Engine)
{
    
    Engine.RetNewConnectByIPPort = function (ip,port)
    {
        if(!port || typeof port !== "number")
            throw "RetNewConnectByIPPort : Error port number = " + port;
        
        if(ip === "0.0.0.0")
            return undefined;
        if(ip === Engine.ip && port === Engine.port)
            return undefined;
        
        var IDArr = CalcIDArr(ip, port);
        return Engine.NewConnect(IDArr, ip, port);
    };
    
    Engine.RetNewConnectByAddr = function (AddrItem)
    {
        var Item = Engine.NewConnect(AddrItem.IDArr, AddrItem.ip, AddrItem.port);
        if(Item)
        {
            Item.AddrItem = AddrItem;
            Engine.LinkHotItem(Item);
        }
        return Item;
    };
    
    Engine.NewConnect = function (IDArr,ip,port)
    {
        if(ip === "0.0.0.0")
            return undefined;
        
        if(!port || typeof port !== "number")
            throw "NewConnect : Error port number = " + port;
        
        if(CompareArr(IDArr, Engine.IDStr) === 0)
        {
            return undefined;
        }
        
        var IDStr = GetHexFromArr(IDArr);
        var Child = {IDStr:IDStr, IDArr:IDArr};
        Engine.ConnectArray.push(Child);
        
        Engine.SetIPPort(Child, ip, port);
        Engine.InitChild(Child);
        return Child;
    };
    
    Engine.SetIPPort = function (Child,ip,port)
    {
        Child.IDArr = CalcIDArr(ip, port);
        Child.IDStr = GetHexFromArr(Child.IDArr);
        
        Child.ip = ip;
        Child.port = port;
        Child.ID = port % 1000;
        Child.Level = Engine.AddrLevelArr(Engine.IDArr, Child.IDArr, 1);
        
        if(JINN_EXTERN.NodeRoot && ip === JINN_EXTERN.NodeRoot.ip && port === JINN_EXTERN.NodeRoot.port)
            Child.ROOT_NODE = 1;
        
        if(ip === Engine.ip && port === Engine.port)
            Child.Self = 1;
    };
    
    Engine.InitChild = function (Child)
    {
        glChildWorkNum++;
        Child.WorkNum = glChildWorkNum;
        
        Child.UseZip = global.glUseZip;
        
        Child.TransferCount = 0;
        Child.LastTransferTime = 0;
        Child.FirstTransferTime = 0;
        Child.SendTransferTime = 0;
        Child.DeltaTransfer = 1000;
        
        Child.ErrCount = 0;
        Child.IDContextNum = 0;
        Child.ContextCallMap = {};
        Child.SendAddrMap = {};
        Child.BlockProcessCount = 0;
        
        Child.SendPacketCount = 0;
        Child.ReceivePacketCount = 0;
        
        Child.ReceiveDataArr = [];
        Child.Node = Engine;
        
        Child.ConnectStart = Date.now();
        
        Child.TimeMap = {};
        Child.LastGetNetConstant = 0;
        Child.LastGetCodeVersion = 0;
        Child.LastGetCode = 0;
        
        Child.IsOpen = function ()
        {
            return (Engine.GetSocketStatus(Child) === 100);
        };
        Child.IsHot = function ()
        {
            var ChildWas = Engine.LevelArr[this.Level];
            if(ChildWas && ChildWas === this && !Engine.InHotStart(this))
            {
                return 1;
            }
            return 0;
        };
        
        if(Engine.InitChildNext)
            Engine.InitChildNext(Child);
        
        Child.ToError = function (Str)
        {
            Engine.ToError(Child, Str, 4);
        };
        Child.ToLog = function (Str,StartLevel)
        {
            var ID = GetNodeID(Child);
            
            Engine.ToLog("<-->" + ID + ":  " + Str, StartLevel);
        };
        Child.ToDebug = function (Str)
        {
            if(global.DEBUG_ID !== "ALL")
                if(Engine.ID !== global.DEBUG_ID)
                    return ;
            
            Child.ToLog(Str);
        };
        Child.Name = function ()
        {
            return Child.ip + ":" + Child.port;
        };
    };
    
    Engine.RemoveConnect = function (Child)
    {
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            if(Engine.ConnectArray[i] === Child)
            {
                Engine.ConnectArray.splice(i, 1);
                break;
            }
        }
    };
}
