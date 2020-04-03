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
var MAX_TRANSFER_TIMEOUT = 3 * 1000;

var MAX_DENY_HOT_CONNECTION = 7 * 1000;
var MAX_HOT_CONNECTION_DELAY = 2 * 1000;

//Engine context

function DoNode(Engine)
{
    if(Engine.ROOT_NODE)
        return 0;
    if(Engine.TickNum % 5 !== 0)
        return;
    
    Engine.CaclNextAddrHashPOW(50);
    for(var L = 0; L < JINN_CONST.MAX_LEVEL_CONNECTION + JINN_CONST.EXTRA_SLOTS_COUNT; L++)
    {
        var Child = Engine.LevelArr[L];
        if(!Child && L >= JINN_CONST.MAX_LEVEL_CONNECTION)
            continue;
        
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
                    if(AddrItem && !AddrItem.ROOT_NODE && !AddrItem.Self && !Engine.InHotDeny(AddrItem) && !Engine.FindConnectByHash(AddrItem.RndHash))
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
            var StrError = "1# DenyHotConnection: The connection was broken, but the hot sign remained.";
            global.DEBUG_ID === "HOT" && Child.ToLog(StrError);
            Engine.StartDisconnect(Child, 1, StrError);
            Engine.DenyHotConnection(Child);
        }
        else
            if(Child.HotStart && !Engine.InHotStart(Child))
            {
                var StrError = "2# DenyHotConnection: More than the allowed connection time has passed.";
                global.DEBUG_ID === "HOT" && Child.ToLog();
                Engine.StartDisconnect(Child, 1, StrError);
                Engine.DenyHotConnection(Child);
            }
            else
                if(Child.HotStart)
                {
                    var NowTime = Date.now();
                    var Delta1 = NowTime - Child.FirstTransferTime;
                    var Delta2 = NowTime - Child.LastTransferTime;
                    if((Delta1 > START_TRANSFER_TIMEOUT) && (Delta2 > MAX_TRANSFER_TIMEOUT))
                    {
                        var StrError = "3# DenyHotConnection: there is no data exchange here for a long time. Delta1=" + Delta1 + "  Delta2=" + Delta2;
                        global.DEBUG_ID === "HOT" && Child.ToLog(StrError);
                        Engine.StartDisconnect(Child, 1, StrError);
                        Engine.DenyHotConnection(Child);
                        Child.LastTransferTime = 0;
                        Child.FirstTransferTime = 0;
                    }
                }
    }
}


function InitClass(Engine)
{
    Engine.LevelArr = [];
    
    Engine.NetConfiguration = 0;
    
    Engine.DisconnectLevel = function (Child,bSend)
    {
        if(bSend && Child.IsHot() && Child.IsOpen())
            Engine.Send("DISCONNECTLEVEL", Child, {});
        
        if(Engine.LevelArr[Child.Level] === Child)
        {
            Engine.LevelArr[Child.Level] = null;
            global.DEBUG_ID === "HOT" && Child.ToLog("*DisconnectLevel* Level=" + Child.Level);
            
            Engine.NetConfiguration++;
        }
        
        if(Child.Level >= JINN_CONST.MAX_LEVEL_CONNECTION)
            Child.Level = Engine.AddrLevelArr(Engine.IDArr, Child.IDArr, 1);
    };
    
    Engine.DISCONNECTLEVEL_SEND = "";
    Engine.DISCONNECTLEVEL = function (Child,Data)
    {
        Engine.DisconnectLevel(Child, 0);
    };
    
    Engine.DenyHotConnection = function (Child)
    {
        if(!Child.HotItem)
            return 0;
        
        Child.HotItem.HotStart = 0;
        Child.HotItem.DenyHotStart = Date.now();
        Engine.DisconnectLevel(Child, 0);
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
                return Engine.SendConnectReq(Child);
            }
            
            if(Engine.TickNum >= JINN_CONST.EXTRA_SLOTS_START_TIME || global.DEV_MODE)
                Engine.UseExtraSlot = 1;
            Engine.Send("CONNECTLEVEL", Child, {UseExtraSlot:Engine.UseExtraSlot}, function (Child,Data)
            {
                var result2 = Data.result;
                global.DEBUG_ID === "HOT" && Child.ToLog("RESULT CONNECTLEVEL = " + Data.result);
                if(result2)
                {
                    result2 = Engine.SetHotConnection(Child, 1);
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
    
    Engine.SetHotConnection = function (Child,bCheckLevel)
    {
        if(bCheckLevel && Child.Level >= JINN_CONST.MAX_LEVEL_CONNECTION)
            Child.Level = Engine.AddrLevelArr(Engine.IDArr, Child.IDArr, 1);
        
        if(!Engine.CanSetHot(Child))
        {
            return 0;
        }
        
        if(!Child.HotItem)
            return 0;
        
        Child.HotItem.HotStart = 0;
        Child.HotItem.DenyHotStart = 0;
        
        if(Child.AddrItem)
            Child.AddrItem.SendHotConnectPeriod = 1000;
        
        Engine.LevelArr[Child.Level] = Child;
        global.DEBUG_ID === "HOT" && Child.ToLog("SetLevel: " + Child.Level);
        
        Engine.NetConfiguration++;
        
        return 1;
    };
    
    Engine.CONNECTLEVEL_SEND = {UseExtraSlot:"byte"};
    Engine.CONNECTLEVEL_RET = {result:"byte"};
    Engine.CONNECTLEVEL = function (Child,Data)
    {
        if(Engine.ROOT_NODE)
            return 0;
        
        var Ret = Engine.SetHotConnection(Child, 1);
        if(!Ret && Data.UseExtraSlot)
        {
            for(var i = JINN_CONST.MAX_LEVEL_CONNECTION; i < JINN_CONST.MAX_LEVEL_CONNECTION + JINN_CONST.EXTRA_SLOTS_COUNT; i++)
            {
                var Slot = Engine.LevelArr[i];
                if(!Slot)
                {
                    Child.Level = i;
                    Ret = Engine.SetHotConnection(Child, 0);
                    break;
                }
            }
        }
        
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
