/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Connect"});
var COUNT_CONNECT_LOOP = 3;
var MAX_DENY_HOT_CONNECTION = 7 * 1000;
var MAX_HOT_CONNECTION_DELAY = 2 * 1000;
var START_TRANSFER_TIMEOUT = 3 * 1000;
var MAX_TRANSFER_TIMEOUT = 2 * 1000;
const D_NODE_ID =  - 5;
function DoNode(Engine)
{
    if(Engine.TickNum % 3 === 0)
        Engine.DoConnect();
}
function InitClass(Engine)
{
    Engine.ActiveConnect = 0;
    Engine.WasSendToGenesis = 0;
    Engine.IndexChildLoop = 0;
    Engine.LevelArr = [];
    Engine.WorkConnect = 0;
    Engine.DoConnect = function ()
    {
        if(Engine.ROOT_NODE)
            return 0;
        if(!Engine.WasSendToGenesis)
        {
            Engine.WasSendToGenesis = 1;
            var Child = Engine.RetChild(JINN_EXTERN.NodeRoot.IDStr, JINN_EXTERN.NodeRoot.ip, JINN_EXTERN.NodeRoot.port);
            Engine.SendConnectReq(Child);
        }
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(!Child)
                continue;
            if(!Engine.InHotStart(Child) && (!Child.Active || Child.Disconnect || Child.Del))
            {
                Engine.ID === D_NODE_ID && Child.ToLog("1# DenyHotConnection");
                Engine.DenyHotConnection(Child);
            }
            else
                if(Child.HotStart && !Engine.InHotStart(Child))
                {
                    Engine.ID === D_NODE_ID && Child.ToLog("2# DenyHotConnection");
                    Engine.DenyHotConnection(Child);
                }
                else
                    if((Date.now() - Child.SendTransferLider > START_TRANSFER_TIMEOUT) && (Date.now() - Child.LastTransferLider > MAX_TRANSFER_TIMEOUT))
                    {
                        Engine.ID === D_NODE_ID && Child.ToLog("3# DenyHotConnection");
                        Engine.DenyHotConnection(Child);
                    }
        }
        Engine.WorkConnect++;
        for(var i = 0; i < COUNT_CONNECT_LOOP; i++)
        {
            var Child = Engine.GetTopTreeScore();
            if(Child.WorkConnect === Engine.WorkConnect)
                break;
            Child.WorkConnect = Engine.WorkConnect;
            Engine.TreeScoreDown(Child);
            if(!Child || Child.Self || Child.Del)
                continue;
            if(!Child.Hot && !Engine.InHotStart(Child) && !Engine.InHotDeny(Child) && Child.ID !== 0)
            {
                Engine.SetNodeLink(Child, 1);
                Engine.ID === D_NODE_ID && Child.ToLog("SetNodeLink ");
            }
            else
                if(Child.Active && !Child.Hot && !Engine.InHotStart(Child) && Child.ID !== 0)
                {
                    Engine.StartDisconnect(Child, 1);
                    Engine.ID === D_NODE_ID && Child.ToLog("StartDisconnect");
                }
                else
                    if(Child.Active || Child.ID === 0)
                    {
                        Engine.SendGetNodesReq(Child);
                    }
        }
        Engine.DoStatConnect();
    };
    Engine.DoStatConnect = function ()
    {
        var CountDel = 0;
        var CountActive = 0;
        var CountAll = 0;
        var CountHot = 0;
        for(var i = 0; i < Engine.NodeArray.length; i++)
        {
            var Item = Engine.NodeArray[i];
            if(Item.Del)
                CountDel++;
            if(Item.Self || Item.Del)
                continue;
            CountAll++;
            if(Item.Active)
                CountActive++;
        }
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child && Child.Hot)
                CountHot++;
        }
        if(CountActive !== Engine.ActiveConnect)
            Engine.ToLog("CountActive/Engine.ActiveConnect" + CountActive + "/" + Engine.ActiveConnect);
    };
    Engine.SendConnectReq = function (Child)
    {
        if(!Engine.CanConnect(Child))
            return ;
        Child.Disconnect = 0;
        var Data = {Protocol:JINN_CONST.PROTOCOL_NAME, Shard:JINN_CONST.SHARD_NAME, NodeHash:Engine.PubAddr, RndAddr:Engine.RndAddr};
        Engine.Send("CONNECT", Child, Data, Engine.OnConnectReturn);
    };
    Engine.OnConnectReturn = function (Child,Data)
    {
        if(!Data.result || !Engine.CanConnect(Child))
        {
            Engine.DeleteConnect(Child);
            return ;
        }
        Child.NodeHash = Data.NodeHash;
        Child.RndAddr = Data.RndAddr;
        Engine.AddConnect(Child);
        if(Engine.InHotStart(Child))
            Engine.SetNodeLink(Child, 1);
    };
    Engine.CONNECT_SEND = {ip:"str30", port:"uint16", Protocol:"str20", Shard:"str5", NodeHash:"hash", RndAddr:"uint"};
    Engine.CONNECT_RET = {result:"byte", NodeHash:"hash", RndAddr:"uint"};
    Engine.CONNECT = function (Child,Data)
    {
        if(Data.Protocol !== JINN_CONST.PROTOCOL_NAME || !Engine.CanConnect(Child))
        {
            Engine.DeleteConnect(Child);
            return {result:0};
        }
        if(Data.ip && Data.port)
        {
            Child.ip = Data.ip;
            Child.port = Data.port;
        }
        Child.DirectIP = 1;
        Child.NodeHash = Data.NodeHash;
        Child.RndAddr = Data.RndAddr;
        Engine.AddConnect(Child);
        return {result:1, NodeHash:Engine.PubAddr, RndAddr:Engine.RndAddr};
    };
    Engine.StartDisconnect = function (Child,bSend)
    {
        if(bSend)
        {
            Engine.DisconnectHot(Child, bSend);
            if(bSend && Child.Active)
                Engine.Send("DISCONNECT", Child, {});
        }
        Engine.DeleteConnect(Child);
    };
    Engine.DISCONNECT_SEND = "";
    Engine.DISCONNECT = function (Child,Data)
    {
        Engine.DeleteConnect(Child);
    };
    Engine.CanConnect = function (Child)
    {
        if(Engine.ROOT_NODE)
            return 1;
        if(Engine.InHotStart(Child))
            return 1;
        return 1;
    };
    Engine.AddConnect = function (Child)
    {
        Child.WasAddConnect = 1;
        if(!Child.Active)
        {
            Child.Active = 1;
            Child.Disconnect = 0;
            Engine.ActiveConnect++;
            Engine.TreeScoreNew(Child);
        }
    };
    Engine.DeleteConnect = function (Child)
    {
        if(Engine.InHotStart(Child))
            Engine.DenyHotConnection(Child);
        if(Child.Active)
        {
            Child.Active = 0;
            Engine.ActiveConnect--;
            Child.SendReqAlive = 0;
            Engine.DisconnectHot(Child, 0);
        }
        if(Engine.DeleteConnectNext)
            Engine.DeleteConnectNext(Child);
        Engine.ResetChild(Child);
    };
    Engine.RemoveConnection = function (FromAddr)
    {
        if(typeof FromAddr !== "string")
            throw "Error type FromAddr=" + FromAddr;
        var Child = Engine.RetChild(FromAddr);
        Engine.DeleteConnect(Child);
    };
    Engine.SendGetNodesReq = function (ToNode)
    {
        if(!ToNode.Iterator)
            ToNode.Iterator = {Level:0, Arr:[]};
        Engine.Send("GETNODES", ToNode, {Iterator:ToNode.Iterator}, function (Child,Data)
        {
            ToNode.Iterator = Data.Iterator;
            for(var i = 0; i < Data.Arr.length; i++)
            {
                var Item = Data.Arr[i];
                if(Item.ip && Item.port)
                {
                    Engine.AddNodeAddr(Item);
                    var Child = Engine.RetChildByIPPort(Item.ip, Item.port);
                    Child.DirectIP = 1;
                }
            }
        });
    };
    Engine.GETNODES_SEND = {Iterator:{Level:"byte", Arr:["uint16"]}};
    Engine.GETNODES_RET = {Iterator:{Level:"byte", Arr:["uint16"]}, Arr:[{ip:"str30", port:"uint16"}]};
    Engine.GETNODES = function (Child,Data)
    {
        Engine.AddNodeAddr({ip:Child.ip, port:Child.port});
        var Arr = [];
        for(var i = 0; i < JINN_CONST.MAX_RET_NODE_LIST; i++)
        {
            var Item = Engine.GetNextNodeAddr(Data.Iterator, 0);
            if(Item)
            {
                Arr.push(Item);
            }
        }
        return {Arr:Arr, Iterator:Data.Iterator};
    };
    Engine.DisconnectHot = function (Child,bSend)
    {
        if(bSend && Child.Hot)
            Engine.Send("DISCONNECTHOT", Child, {});
        var bWas = 0;
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            if(Engine.LevelArr[i] === Child)
            {
                bWas = 1;
                Engine.LevelArr[i] = null;
            }
        }
        Engine.ID === D_NODE_ID && Child.ToLog("*DisconnectHot* ");
        if(!bWas)
            return ;
    };
    Engine.DISCONNECTHOT_SEND = "";
    Engine.DISCONNECTHOT = function (Child,Data)
    {
        Engine.DisconnectHot(Child, 0);
    };
    Engine.SetHotConnection = function (Child,bAlways)
    {
        Child.HotStart = 0;
        Child.DenyHotStart = 0;
        var ChildWas = Engine.LevelArr[Child.Level];
        if(ChildWas && ChildWas !== Child && ChildWas.Hot)
        {
            if(!bAlways)
                return 0;
            ToLog("Error SetHotConnection");
        }
        Engine.LevelArr[Child.Level] = Child;
        return 1;
    };
    Engine.DenyHotConnection = function (Child)
    {
        Child.HotStart = 0;
        Child.DenyHotStart = Date.now();
        Engine.TreeScoreDown(Child);
        Engine.DisconnectHot(Child, 0);
    };
    Engine.CheckHotConnection = function (Child)
    {
        if(!Child.Hot)
            Engine.DenyHotConnection(Child);
    };
    Engine.InHotStart = function (Child)
    {
        if(Child.HotStart && Date.now() - Child.HotStart <= MAX_HOT_CONNECTION_DELAY)
            return 1;
        else
            return 0;
    };
    Engine.InHotDeny = function (Child)
    {
        if(Child.DenyHotStart && Date.now() - Child.DenyHotStart <= random(MAX_DENY_HOT_CONNECTION))
            return 1;
        else
            return 0;
    };
    Engine.SetNodeLink = function (Child,bSend)
    {
        if(Engine.ROOT_NODE)
            return 0;
        if(Engine.InHotDeny(Child))
        {
            return 0;
        }
        if(Child.Level >= JINN_CONST.MAX_LEVEL_CONNECTION)
            return 0;
        var ChildWas = Engine.LevelArr[Child.Level];
        if(ChildWas && ChildWas !== Child && !Engine.InHotStart(ChildWas))
        {
            return 0;
        }
        Engine.LevelArr[Child.Level] = Child;
        if(bSend)
        {
            if(!Child.WasStartHot1)
                Child.WasStartHot1 = 0;
            Child.WasStartHot1++;
            Child.HotStart = Date.now();
            if(!Child.Active)
            {
                Engine.SendConnectReq(Child);
                return 1;
            }
            if(!Child.WasStartHot2)
                Child.WasStartHot2 = 0;
            Child.WasStartHot2++;
            Engine.Send("ADDLEVELCONNECT", Child, {}, function (Child,Data)
            {
                var result2 = Data.result;
                if(result2)
                {
                    result2 = Engine.SetHotConnection(Child);
                    Engine.ID === D_NODE_ID && Child.ToLog("SetHotConnection: Level=" + Child.Level + " result:" + result2);
                }
                if(!result2)
                {
                    Engine.ID === D_NODE_ID && Child.ToLog("DenyHotConnection: Level=" + Child.Level);
                    Engine.DenyHotConnection(Child);
                }
            });
        }
        return 1;
    };
    Engine.ADDLEVELCONNECT_SEND = "";
    Engine.ADDLEVELCONNECT_RET = {result:"byte"};
    Engine.ADDLEVELCONNECT = function (Child,Data)
    {
        if(Engine.ROOT_NODE)
            return 0;
        var Ret = Engine.SetNodeLink(Child, 0);
        if(Ret)
        {
            Ret = Engine.SetHotConnection(Child);
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
    Engine.AddrLevelArr = function (arr1,arr2)
    {
        var Level = Engine.AddrLevelArr0(arr1, arr2);
        return Level;
    };
}
