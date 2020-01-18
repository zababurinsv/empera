/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Search algorithms and support for hot links
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Hot"});
var START_TRANSFER_TIMEOUT = 3 * 1000;
var MAX_TRANSFER_TIMEOUT = 2 * 1000;
var MAX_DENY_HOT_CONNECTION = 7 * 1000;
var MAX_HOT_CONNECTION_DELAY = 2 * 1000;
function DoNode(Engine)
{
    if(Engine.ROOT_NODE)
        return 0;
    if(Engine.TickNum % 5 !== 0)
        return ;
    Engine.CaclNextAddrHashPOW(50);
    for(var L = 0; L < JINN_CONST.MAX_LEVEL_CONNECTION; L++)
    {
        var Child = Engine.LevelArr[L];
        if(!Child || !Child.IsHot())
        {
            var LArr = Engine.NodesArrByLevel[L];
            if(LArr)
            {
                if(LArr.IndexLoop === undefined)
                    LArr.IndexLoop =  - 1;
                for(var i = 0; i < LArr.length; i++)
                {
                    LArr.IndexLoop++;
                    var AddrItem = LArr[LArr.IndexLoop % LArr.length];
                    if(AddrItem && !AddrItem.ROOT_NODE && !AddrItem.Self && !Engine.InHotDeny(AddrItem))
                    {
                        if(AddrItem.SendHotConnectPeriod === undefined && CompareArr(Engine.IDArr, AddrItem.IDArr) > 0)
                        {
                            AddrItem.SendHotConnectPeriod = 1000;
                            continue;
                        }
                        if(!CanTime(AddrItem, "SendHotConnect", 1000))
                            continue;
                        AddrItem.SendHotConnectPeriod += 1000;
                        var Child2 = Engine.RetNewConnectByAddr(AddrItem);
                        if(Child2)
                        {
                            global.DEBUG_ID === "HOT" && Child2.ToLog("Create hot connect Level=" + L);
                            Child2.InComeConnect = 0;
                            if(Engine.TryHotConnection(Child2, 1))
                                break;
                        }
                    }
                }
            }
            continue;
        }
        if(Child.ROOT_NODE)
            continue;
        if(!Engine.InHotStart(Child) && (!Child.IsOpen() || Child.Del))
        {
            global.DEBUG_ID === "HOT" && Child.ToLog("1# DenyHotConnection");
            Engine.StartDisconnect(Child, 1);
            Engine.DenyHotConnection(Child);
        }
        else
            if(Child.HotStart && !Engine.InHotStart(Child))
            {
                global.DEBUG_ID === "HOT" && Child.ToLog("2# DenyHotConnection");
                Engine.StartDisconnect(Child, 1);
                Engine.DenyHotConnection(Child);
            }
            else
                if((Date.now() - Child.SendTransferLider > START_TRANSFER_TIMEOUT) && (Date.now() - Child.LastTransferLider > MAX_TRANSFER_TIMEOUT))
                {
                    global.DEBUG_ID === "HOT" && Child.ToLog("3# DenyHotConnection");
                    Engine.StartDisconnect(Child, 1);
                    Engine.DenyHotConnection(Child);
                }
    }
}
function InitClass(Engine)
{
    Engine.LevelArr = [];
    Engine.NetConfiguration = 0;
    Engine.DisconnectHot = function (Child,bSend)
    {
        if(bSend && Child.IsHot())
            Engine.Send("DISCONNECTHOT", Child, {});
        if(Engine.LevelArr[Child.Level] === Child)
        {
            Engine.LevelArr[Child.Level] = null;
            global.DEBUG_ID === "HOT" && Child.ToLog("*DisconnectHot* Level=" + Child.Level);
            Engine.NetConfiguration++;
        }
    };
    Engine.DISCONNECTHOT_SEND = "";
    Engine.DISCONNECTHOT = function (Child,Data)
    {
        Engine.DisconnectHot(Child, 0);
    };
    Engine.DenyHotConnection = function (Child)
    {
        if(!Child.HotItem)
            return 0;
        Child.HotItem.HotStart = 0;
        Child.HotItem.DenyHotStart = Date.now();
        Engine.DisconnectHot(Child, 0);
    };
    Engine.CheckHotConnection = function (Child)
    {
        if(!Child.IsHot())
            Engine.DenyHotConnection(Child);
    };
    Engine.LinkHotItem = function (Child)
    {
        if(!Child.AddrItem.HotItem)
            Child.AddrItem.HotItem = {};
        Child.HotItem = Child.AddrItem.HotItem;
    };
    Engine.InHotStart = function (Item)
    {
        if(!Item.HotItem)
            return 0;
        var HotItem = Item.HotItem;
        if(HotItem.HotStart && Date.now() - HotItem.HotStart <= MAX_HOT_CONNECTION_DELAY)
            return 1;
        else
            return 0;
    };
    Engine.InHotDeny = function (Item)
    {
        if(!Item.HotItem)
            return 0;
        var HotItem = Item.HotItem;
        if(HotItem.DenyHotStart && Date.now() - HotItem.DenyHotStart <= MAX_DENY_HOT_CONNECTION)
            return 1;
        else
            return 0;
    };
    Engine.TryHotConnection = function (Child,bSend)
    {
        if(Engine.ROOT_NODE)
            return 0;
        if(!Child.HotItem)
            return 0;
        if(!Engine.CanSetHot(Child))
            return 0;
        Engine.LevelArr[Child.Level] = Child;
        if(bSend)
        {
            Child.HotItem.HotStart = Date.now();
            if(!Child.IsOpen())
            {
                Engine.SendConnectReq(Child);
                return 1;
            }
            Engine.Send("ADDLEVELCONNECT", Child, {}, function (Child,Data)
            {
                var result2 = Data.result;
                global.DEBUG_ID === "HOT" && Child.ToLog("RESULT ADDLEVELCONNECT = " + Data.result);
                if(result2)
                {
                    result2 = Engine.SetHotConnection(Child);
                    global.DEBUG_ID === "HOT" && Child.ToLog("SetHotConnection: Level=" + Child.Level + " result:" + result2);
                }
                if(!result2)
                {
                    global.DEBUG_ID === "HOT" && Child.ToLog("DenyHotConnection: Level=" + Child.Level);
                    Engine.DenyHotConnection(Child);
                }
            });
        }
        return 1;
    };
    Engine.CanSetHot = function (Child)
    {
        if(!Child.HotItem)
            return 0;
        if(Engine.InHotDeny(Child))
        {
            return 0;
        }
        var ChildWas = Engine.LevelArr[Child.Level];
        if(ChildWas && ChildWas !== Child && (ChildWas.IsHot() || Engine.InHotStart(ChildWas)))
        {
            return 0;
        }
        return 1;
    };
    Engine.SetHotConnection = function (Child)
    {
        if(!Engine.CanSetHot(Child))
        {
            return 0;
        }
        if(!Child.HotItem)
            return 0;
        Child.HotItem.HotStart = 0;
        Child.HotItem.DenyHotStart = 0;
        Engine.LevelArr[Child.Level] = Child;
        global.DEBUG_ID === "HOT" && Child.ToLog("SetLevel: " + Child.Level + "  port:" + Child._port);
        Engine.NetConfiguration++;
        return 1;
    };
    Engine.ADDLEVELCONNECT_SEND = "";
    Engine.ADDLEVELCONNECT_RET = {result:"byte"};
    Engine.ADDLEVELCONNECT = function (Child,Data)
    {
        if(Engine.ROOT_NODE)
            return 0;
        var Ret = Engine.SetHotConnection(Child);
        if(!Ret)
        {
            Engine.DenyHotConnection(Child);
        }
        return {result:Ret};
    };
    Engine.AddrLevelArr0 = function (arr1,arr2)
    {
        var Level = 0;
        for(var i = arr1.length - 1; i >= 0; i--)
        {
            var a1 = arr1[i];
            var a2 = arr2[i];
            for(var b = 0; b < 8; b++)
            {
                if((a1 & 1) !== (a2 & 1))
                    return Level;
                a1 = a1 >> 1;
                a2 = a2 >> 1;
                Level++;
            }
        }
        return Level;
    };
    Engine.LevelOfDensity = function (arr1,arr2,P)
    {
        var Level = 0;
        for(var i = 0; i < 32; i++)
        {
            var n = arr1.length - i - 1;
            var M = P[i];
            if(!M)
                M = 2;
            var a1 = arr1[n] % M;
            var a2 = arr2[n] % M;
            if(a1 !== a2)
                return Level + (M + a1 - a2 - 1) % (M - 1);
            Level += (M - 1);
        }
        return Level;
    };
    Engine.AddrLevelArr = function (arr1,arr2,bLimit)
    {
        var Level = Engine.AddrLevelArr0(arr1, arr2);
        if(bLimit && Level >= JINN_CONST.MAX_LEVEL_CONNECTION)
            Level = JINN_CONST.MAX_LEVEL_CONNECTION - 1;
        return Level;
    };
}
