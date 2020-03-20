/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Dual connection protection algorithm:
 If two nodes have public Internet addresses, it is likely that they will simultaneously connect to each other
 In this case, you need to recognize this case and leave only one connection.
 The HANDSHAKE method contains ip+port as a parameter and is used to generate a 32-byte unique IDArr number
 If the nodes see that they already had a connection (Child) with the same value, it means that it is the same node
 In this case, the Engine arrays are compared.IDArr and Child.IDArr between and depending on this
 the incoming or outgoing connection with this node is deleted.
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Connect"});

var MAX_CONNECT_TIMEOUT = 4 * 1000;

var glWorkConnect = 0;

//Engine context

function DoNode(Engine)
{
    if(Engine.TickNum % 10 !== 0)
        return ;
    
    if(Engine.ROOT_NODE)
        return 0;
    
    glWorkConnect++;
    if(!Engine.WasSendToGenesis && JINN_EXTERN.NodeRoot)
    {
        Engine.WasSendToGenesis = 1;
        var Child = Engine.NewConnect(JINN_EXTERN.NodeRoot.IDArr, JINN_EXTERN.NodeRoot.ip, JINN_EXTERN.NodeRoot.port);
        if(Child)
        {
            Child.ROOT_NODE = 1;
            Engine.SendConnectReq(Child);
        }
    }
    else
        if(Engine.NodesTree.size === 0 && Engine.TickNum > 10)
            Engine.WasSendToGenesis = 0;
    for(var i = 0; i < Engine.ConnectArray.length; i++)
    {
        var Child = Engine.ConnectArray[i];
        if(!Child || Child.ROOT_NODE || Child.Del)
        {
            continue;
        }
        
        var AddrItem = Child.AddrItem;
        if(!AddrItem || !Child.IsHot())
        {
            var DeltaTime = Date.now() - Child.ConnectStart;
            if(DeltaTime > MAX_CONNECT_TIMEOUT)
            {
                
                var StrError = "MAX_CONNECT_TIMEOUT StartDisconnect #" + i + "  DeltaTime=" + DeltaTime;
                global.DEBUG_ID === "HOT" && Child.ToLog(StrError);
                Engine.StartDisconnect(Child, 1, StrError);
            }
            continue;
        }
        
        if(AddrItem.WorkConnect !== glWorkConnect)
        {
            AddrItem.ConnectCount = 0;
            AddrItem.WorkConnect = glWorkConnect;
        }
        
        AddrItem.ConnectCount++;
        Child.ConnectNum = AddrItem.ConnectCount;
    }
    for(var i = 0; i < Engine.ConnectArray.length; i++)
    {
        var Child = Engine.ConnectArray[i];
        if(!Child || Child.ROOT_NODE || Child.Del || !Child.AddrItem || !Child.IsOpen() || Child.Self || !Child.IsHot())
        {
            continue;
        }
        
        if(Child.AddrItem.ConnectCount <= 1)
            continue;
        
        if(CompareArr(Engine.IDArr, Child.IDArr) > 0)
        {
            if(Child.InComeConnect)
            {
                var StrError = "StartDisconnect 1 Num:" + Child.ConnectNum + " port:" + Child._port;
                global.DEBUG_ID === "HOT" && Child.ToLog(StrError);
                Engine.StartDisconnect(Child, 1, StrError);
                Engine.DenyHotConnection(Child);
            }
        }
        else
        {
            if(!Child.InComeConnect)
            {
                var StrError = "StartDisconnect 2 Num: " + Child.ConnectNum;
                global.DEBUG_ID === "HOT" && Child.ToLog(StrError);
                Engine.StartDisconnect(Child, 1, StrError);
                Engine.DenyHotConnection(Child);
            }
        }
    }
    
    Engine.DoStatConnect();
}


function InitClass(Engine)
{
    Engine.WasSendToGenesis = 0;
    Engine.IndexChildLoop = 0;
    
    Engine.ConnectArray = [];
    
    Engine.DoStatConnect = function ()
    {
        var CountDel = 0;
        var CountActive = 0;
        var CountAll = 0;
        var CountHot = 0;
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Item = Engine.ConnectArray[i];
            if(Item.Del)
                CountDel++;
            if(Item.Del)
                continue;
            
            CountAll++;
            if(Item.IsOpen())
                CountActive++;
        }
        
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child && Child.IsHot())
                CountHot++;
        }
    };
    
    Engine.SendConnectReq = function (Child)
    {
        if(!Engine.CanConnect(Child))
            return ;
        
        Engine.CreateConnectionToChild(Child, function (result)
        {
            if(!result)
                return ;
            
            Engine.StartHandShake(Child);
        });
    };
    
    Engine.CanConnect = function (Child)
    {
        if(Engine.ROOT_NODE)
            return 1;
        
        return 1;
    };
    
    Engine.OnAddConnect = function (Child)
    {
    };
    
    Engine.StartDisconnect = function (Child,bSend,StrError)
    {
        Engine.DisconnectLevel(Child, bSend);
        if(bSend && Child.IsOpen())
        {
            Engine.CloseConnectionToChild(Child, StrError);
            Engine.OnDeleteConnect(Child);
        }
        else
        {
            Engine.OnDeleteConnect(Child);
        }
    };
    
    Engine.OnDeleteConnect = function (Child,StrError)
    {
        if(Engine.InHotStart(Child))
            Engine.DenyHotConnection(Child);
        
        Engine.DisconnectLevel(Child, 0);
        
        if(Engine.OnDeleteConnectNext)
            Engine.OnDeleteConnectNext(Child, StrError);
        
        Engine.RemoveConnect(Child);
    };
}

function CanTime(Obj,Name,Period)
{
    var NameLastTime = Name + "LastTime";
    var NamePeriod = Name + "Period";
    
    var CurTume = Date.now();
    if(!Obj[NameLastTime])
    {
        Obj[NameLastTime] = 0;
        Obj[NamePeriod] = Period;
    }
    var Delta = CurTume - Obj[NameLastTime];
    if(Delta < Obj[NamePeriod])
        return 0;
    Obj[NameLastTime] = CurTume;
    return 1;
}

global.CanTime = CanTime;
