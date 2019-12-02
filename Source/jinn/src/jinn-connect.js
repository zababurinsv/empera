/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({Init:Init, DoNode:DoNode, Name:"Connect"});
var COUNT_CONNECT_LOOP = 5;
var MAX_DENY_HOT_CONNECTION = 20 * 1000;
var MAX_HOT_CONNECTION_DELAY = 2 * 1000;
var MAX_MAXHASH_CONNECTION_DELAY = 3 * 1000;
const NODE_ADDR_FORMAT = {ip:"str30", port:"uint16"};
function DoNode(Engine)
{
    if(Engine.TickNum % 3 === 0)
        Engine.DoConnect();
}
function Init(Engine)
{
    Engine.ActiveConnect = 0;
    Engine.WasSendToGenesis = 0;
    Engine.IndexChildLoop = 0;
    Engine.LevelArr = [];
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
            var Item = Engine.LevelArr[i];
            if(!Item)
                continue;
            if(!Item.Active || Item.Del)
                Engine.DenyHotConnection(Item);
            else
                if(Item.HotStart && (Date.now() - Item.HotStart > MAX_HOT_CONNECTION_DELAY))
                    Engine.DenyHotConnection(Item);
                else
                    if(Item.Hot && (Date.now() - Item.LastTransferLider > MAX_MAXHASH_CONNECTION_DELAY))
                        Engine.DenyHotConnection(Item);
        }
        for(var i = 0; i < Engine.NodeArray.length; i++)
        {
            var Item = Engine.NodeArray[i];
            if(Item.Del || Item.Self)
                continue;
            if(!Item.Hot && !Item.HotStart)
                Engine.SetNodeLink(Item, 1);
        }
        var CountDel = 0;
        var CountActive = 0;
        var CountAll = 0;
        var CountHot = 0;
        for(var i = 0; i < Engine.NodeArray.length; i++)
        {
            Engine.IndexChildLoop++;
            var Item = Engine.NodeArray[Engine.IndexChildLoop % Engine.NodeArray.length];
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
            if(Engine.LevelArr[i] && Engine.LevelArr[i].Hot)
                CountHot++;
        }
        if(CountActive !== Engine.ActiveConnect)
            Engine.ToLog("CountActive/Engine.ActiveConnect" + CountActive + "/" + Engine.ActiveConnect);
        var MaxCountLoop = COUNT_CONNECT_LOOP;
        for(var i = 0; i < Engine.NodeArray.length; i++)
        {
            Engine.IndexChildLoop++;
            var Item = Engine.NodeArray[Engine.IndexChildLoop % Engine.NodeArray.length];
            if(Item.Self || Item.Del)
                continue;
            var Was = 0;
            if(Item.Active)
            {
                if(CountActive > JINN_CONST.MAX_ACTIVE_COUNT)
                {
                    if(!Item.Hot && !Item.HotStart && !Engine.ROOT_NODE)
                    {
                        Engine.StartDisconnect(Item, 1);
                        Was = 1;
                    }
                }
                else
                {
                    Engine.SendGetNodesReq(Item);
                    Was = 1;
                }
            }
            else
            {
                if(CountActive <= 2 * JINN_CONST.MAX_ACTIVE_COUNT / 3)
                {
                    Engine.SendConnectReq(Item);
                    Was = 1;
                }
            }
            if(Was)
            {
                MaxCountLoop--;
                if(MaxCountLoop <= 0)
                    break;
            }
        }
    };
    Engine.SendConnectReq = function (ToNode)
    {
        if(!Engine.CanConnect(ToNode))
            return ;
        var Data = {};
        if(Engine.DirectIP && Engine.ip)
            Data = {ip:Engine.ip, port:Engine.port};
        Engine.Send("CONNECT", ToNode, Data, function (Child,Data)
        {
            if(!Data.result)
                return ;
            if(!Engine.CanConnect(Child))
                return ;
            Engine.AddConnect(Child);
        });
    };
    Engine.CONNECT_SEND = NODE_ADDR_FORMAT;
    Engine.CONNECT_RET = {result:"byte"};
    Engine.CONNECT = function (Child,Data)
    {
        if(!Engine.CanConnect(Child))
            return {result:0};
        if(Data.ip && Data.port)
        {
            Child.ip = Data.ip;
            Child.port = Data.port;
            Child.DirectIP = 1;
        }
        Engine.AddConnect(Child);
        return {result:1};
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
        if(Engine.ActiveConnect >= JINN_CONST.MAX_ACTIVE_COUNT)
            return 0;
        else
            return 1;
    };
    Engine.AddConnect = function (Child)
    {
        if(!Child.Active)
        {
            Child.Active = 1;
            Child.Del = 0;
            Engine.ActiveConnect++;
        }
    };
    Engine.DeleteConnect = function (Child)
    {
        if(Child.Active)
        {
            Child.Active = 0;
            Engine.ActiveConnect--;
            Child.SendReqAlive = 0;
            Engine.DisconnectHot(Child, 0);
            if(Engine.DeleteConnectNext)
                Engine.DeleteConnectNext(Child);
        }
    };
    Engine.RemoveConnection = function (FromAddr)
    {
        if(typeof FromAddr !== "string")
            throw "Error type FromAddr=" + FromAddr;
        var Child = Engine.RetChild(FromAddr);
        Engine.DeleteConnect(Child);
        Child.Del = 1;
    };
    Engine.SendGetNodesReq = function (ToNode)
    {
        Engine.Send("GETNODES", ToNode, {}, function (Child,Data)
        {
            for(var i = 0; i < Data.Arr.length; i++)
            {
                var Item = Data.Arr[i];
                var Child = Engine.GetChildByIPPort(Item.ip, Item.port);
                Child.DirectIP = 1;
            }
        });
    };
    Engine.GETNODES_SEND = "";
    Engine.GETNODES_RET = {Arr:[NODE_ADDR_FORMAT]};
    Engine.GETNODES = function (Child,Data)
    {
        var Arr = [];
        for(var i = 0; i < Engine.NodeArray.length; i++)
        {
            var Item = Engine.NodeArray[i];
            if(Item.DirectIP && Child !== Item && !Item.Del && !Child.SendAddrMap[Item.IDStr])
            {
                Child.SendAddrMap[Item.IDStr] = 1;
                Arr.push({ip:Item.ip, port:Item.port});
                if(Arr.length >= JINN_CONST.MAX_RET_NODE_LIST)
                    break;
            }
        }
        return {Arr:Arr};
    };
    Engine.DisconnectHot = function (Child,bSend)
    {
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            if(Engine.LevelArr[i] === Child)
            {
                Engine.LevelArr[i] = null;
            }
        }
        if(bSend && Child.Hot)
            Engine.Send("DISCONNECTHOT", Child, {});
        Child.Hot = 0;
    };
    Engine.DISCONNECTHOT_SEND = "";
    Engine.DISCONNECTHOT = function (Child,Data)
    {
        Engine.DisconnectHot(Child, 0);
    };
    Engine.SetHotConnection = function (Child,bAlways)
    {
        Child.Hot = 1;
        Child.HotStart = 0;
        Child.DenyHotStart = 0;
        var Level = Engine.AddrLevelArr(Engine.IDArr, Child.IDArr);
        var ChildWas = Engine.LevelArr[Level];
        if(ChildWas && ChildWas !== Child && ChildWas.Hot)
        {
            Child.Hot = 0;
            if(!bAlways)
                return 0;
            ToLog("Error SetHotConnection");
        }
        Engine.LevelArr[Level] = Child;
        return 1;
    };
    Engine.DenyHotConnection = function (Child)
    {
        Child.Hot = 0;
        Child.HotStart = 0;
        Child.DenyHotStart = Date.now();
        Engine.DisconnectHot(Child, 0);
    };
    Engine.CheckHotConnection = function (Child)
    {
        var Arr = Engine.LevelArr;
        for(var i = 0; i < Arr.length; i++)
        {
            var Child2 = Arr[i];
            if(Child2 && Child2.IDStr === Child.IDStr)
            {
                return 1;
            }
        }
        Engine.SetHotConnection(Child, 0);
    };
    Engine.SetNodeLink = function (Child,bSend)
    {
        if(Engine.ROOT_NODE)
            return 0;
        if(Child.DenyHotStart && (Date.now() - Child.DenyHotStart < MAX_DENY_HOT_CONNECTION))
        {
            return 0;
        }
        var Level = Engine.AddrLevelArr(Engine.IDArr, Child.IDArr);
        if(Level >= JINN_CONST.MAX_LEVEL_CONNECTION)
            return 0;
        var ChildWas = Engine.LevelArr[Level];
        if(ChildWas && ChildWas !== Child)
        {
            return 0;
        }
        Engine.LevelArr[Level] = Child;
        if(bSend)
        {
            Child.HotStart = Date.now();
            if(!Child.Active)
            {
                Engine.SendConnectReq(Child);
            }
            Engine.Send("ADDLEVELCONNECT", Child, {}, function (Child,Data)
            {
                var result2 = Data.result;
                if(result2)
                {
                    result2 = Engine.SetHotConnection(Child);
                }
                if(!result2)
                {
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
    Engine.AddrLevelArr = function (arr1,arr2)
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
}
