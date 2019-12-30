/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Child"});
var glChildWorkNum = 0;
function InitClass(Engine)
{
    Engine.RetNewConnectByIPPort = function (ip,port)
    {
        if(!port || typeof port !== "number")
            throw "RetNewConnectByIPPort : Error port number = " + port;
        if(ip === Engine.ip && port === Engine.port)
            return undefined;
        var IDArr = Engine.CalcIDArr(ip, port);
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
    Engine.CalcIDArr = function (ip,port)
    {
        var HostName = String(ip) + ":" + port;
        var IDArr = sha3(HostName);
        return IDArr;
    };
    Engine.NewConnect = function (IDArr,ip,port)
    {
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
        Child.IDArr = Engine.CalcIDArr(ip, port);
        Child.IDStr = GetHexFromArr(Child.IDArr);
        Child.ip = ip;
        Child.port = port;
        Child.ID = port % 1000;
        Child.Level = Engine.AddrLevelArr(Engine.IDArr, Child.IDArr, 1);
        if(ip === JINN_EXTERN.NodeRoot.ip && port === JINN_EXTERN.NodeRoot.port)
            Child.ROOT_NODE = 1;
        if(ip === Engine.ip && port === Engine.port)
            Child.Self = 1;
    };
    Engine.InitChild = function (Child)
    {
        glChildWorkNum++;
        Child.WorkNum = glChildWorkNum;
        Child.LastTransferLider = 0;
        Child.ErrCount = 0;
        Child.IDContextNum = 0;
        Child.ContextCallMap = {};
        Child.SendAddrMap = {};
        Child.SendPacketCount = 0;
        Child.ReceivePacketCount = 0;
        Child.ReceiveDataArr = [];
        Child.Node = Engine;
        Child.ConnectStart = Date.now();
        Object.defineProperty(Child, "Open", {get:function ()
            {
                return !!this.LinkChild;
            }});
        Object.defineProperty(Child, "Active", {get:function ()
            {
                return !!this.LinkChild;
            }});
        Object.defineProperty(Child, "Hot", {get:function ()
            {
                var ChildWas = Engine.LevelArr[this.Level];
                if(ChildWas && ChildWas === this && !Engine.InHotStart(this))
                {
                    return 1;
                }
                return 0;
            }});
        if(Engine.InitChildNext)
            Engine.InitChildNext(Child);
        Child.ToError = function (Str)
        {
            Engine.ToError(Child, Str, 0);
        };
        Child.ToLog = function (Str)
        {
            var ID = GetNodeID(Child);
            Engine.ToLog("<-->" + ID + ":  " + Str);
        };
        Child.ToDebug = function (Str)
        {
            if(global.DEBUG_ID !== "ALL")
                if(Engine.ID !== global.DEBUG_ID)
                    return ;
            Child.ToLog(Str);
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
