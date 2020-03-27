/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * Stores a list of all network node addresses
 * Allows you to bypass this list sequentially by levels
 * Properties:
 * - rotation of nodes on a large address space (almost unlimited)
 * - the traversal iterator is stored outside of this list (external, i.e. on the calling side)
 * - if the number of nodes at one level is more than MAX_LEVEL_NODES, then the old elements will be re-formatted
 * - nodes must perform POW to get their address in the list of nodes
 *
**/




'use strict';
global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter, DoNode:DoNode, Name:"Addr"});

const POW_MEMORY_BIT_SIZE = 18;
const POW_MAX_ITEM_IN_MEMORRY = 1 << POW_MEMORY_BIT_SIZE;
const POW_SHIFT_MASKA = 32 - POW_MEMORY_BIT_SIZE;

var COUNT_LIST_LOOP = 3;


//Engine context

function DoNode(Engine)
{
    if(Engine.TickNum % 10 !== 0)
        return ;
    if(!Engine.ConnectArray.length)
        return ;
    for(var i = 0; i < COUNT_LIST_LOOP; i++)
    {
        Engine.IndexChildLoop++;
        var Child = Engine.ConnectArray[Engine.IndexChildLoop % Engine.ConnectArray.length];
        if(!Child || Child.Del || !Child.IsOpen())
            continue;
        Engine.SendGetNodesReq(Child);
    }
}

function InitClass(Engine)
{
    Engine.NodesArrByLevel = [];
    Engine.NodesTree = new RBTree(FNodeAddr);
    
    Engine.SendGetNodesReq = function (Child)
    {
        if(!CanTime(Child, "SendGetNodesReq", 1000))
            return ;
        
        if(!Child.Iterator)
            Child.Iterator = {Level:0, Arr:[]};
        
        Engine.Send("GETNODES", Child, {Iterator:Child.Iterator}, function (Child,Data)
        {
            var Count = 0;
            Child.Iterator = Data.Iterator;
            for(var i = 0; i < Data.Arr.length; i++)
            {
                var Item = Data.Arr[i];
                if(Item.ip && Item.port)
                {
                    if(IsLocalIP(Item.ip))
                        continue;
                    
                    if(Engine.AddNodeAddr(Item, Child) === 1)
                        Count++;
                }
            }
            
            if(Count === 0)
            {
                Child.SendGetNodesReqPeriod += 1000;
            }
            else
            {
                Child.SendGetNodesReqPeriod = 1000;
            }
        });
    };
    Engine.GETNODES_SEND = {Iterator:{Level:"byte", Arr:["uint16"]}};
    Engine.GETNODES_RET = {Iterator:{Level:"byte", Arr:["uint16"]}, Arr:[{ip:"str30", port:"uint16", BlockNum:"uint32", Nonce:"uint"}]};
    Engine.GETNODES = function (Child,Data)
    {
        
        var Arr = [];
        if(Engine.DirectIP && !Engine.ROOT_NODE)
            if(IsZeroArr(Data.Iterator))
            {
                if(Engine.AddrItem)
                {
                    Arr.push(Engine.AddrItem);
                }
            }
        
        for(var i = 0; i < JINN_CONST.MAX_RET_NODE_LIST; i++)
        {
            var Item = Engine.GetNextNodeAddr(Data.Iterator, 0);
            if(Item && !Item.IsLocal)
            {
                Arr.push(Item);
            }
        }
        
        return {Arr:Arr, Iterator:Data.Iterator};
    };
    Engine.GetCountAddr = function ()
    {
        return Engine.NodesTree.size;
    };
    Engine.AddNodeAddr = function (AddrItem,Child)
    {
        if(AddrItem.ip === "0.0.0.0")
        {
            ToLogOne("AddNodeAddr:Error ip from " + ChildName(Child));
            return 0;
        }
        
        if(!Engine.IsCorrectNode(AddrItem.ip, AddrItem.port))
        {
            Engine.ToLog("Not correct node ip = " + AddrItem.ip + ":" + AddrItem.port, 3);
            return 0;
        }
        
        AddrItem.IDArr = CalcIDArr(AddrItem.ip, AddrItem.port);
        
        var Level = Engine.AddrLevelArr(Engine.IDArr, AddrItem.IDArr, 1);
        var Arr = GetArrByLevel(Level);
        
        var Tree = Engine.NodesTree;
        var Find = Tree.find(AddrItem);
        
        if(Find)
        {
            if(!Engine.SetParamsNodeAddr(Find, AddrItem))
                return 2;
            for(var i = 0; i < Arr.length; i++)
            {
                var ArrItem = Arr[i];
                if(ArrItem === Find)
                {
                    Arr.splice(i, 1);
                    Arr.push(ArrItem);
                    
                    Arr.DeltaPos++;
                    return 3;
                }
            }
        }
        else
        {
            Tree.insert(AddrItem);
        }
        
        if(Arr.length >= JINN_CONST.MAX_LEVEL_NODES)
        {
            Arr.splice(0, 1);
            Arr.DeltaPos++;
        }
        
        AddrItem.IsLocal = IsLocalIP(AddrItem.ip);
        
        Arr.push(AddrItem);
        
        if(AddrItem.ip === Engine.ip && AddrItem.port === Engine.port)
            AddrItem.Self = 1;
        
        if(JINN_EXTERN.NodeRoot && AddrItem.ip === JINN_EXTERN.NodeRoot.ip && AddrItem.port === JINN_EXTERN.NodeRoot.port)
            AddrItem.ROOT_NODE = 1;
        return 1;
    };
    
    Engine.SetItemSelf = function (AddrItem)
    {
        var Find = Engine.NodesTree.find(AddrItem);
        if(Find)
            Find.Self = 1;
    };
    Engine.SetItemRndHash = function (AddrItem,RndHash)
    {
        if(IsZeroArr(RndHash))
            return ;
        
        var Find = Engine.NodesTree.find(AddrItem);
        if(Find)
        {
            Find.RndHash = RndHash;
        }
    };
    Engine.GetNextNodeAddr = function (Iterator,RecurcionNum)
    {
        var Level = Iterator.Level % JINN_CONST.MAX_LEVEL_CONNECTION;
        Iterator.Level = Level + 1;
        
        var Pos = Iterator.Arr[Level];
        if(!Pos)
            Pos = 0;
        
        var Arr = GetArrByLevel(Level);
        
        var Index = Pos - Arr.DeltaPos;
        if(Index < 0)
            Index = 0;
        
        if(Index < Arr.length)
        {
            Iterator.Arr[Level] = Index + Arr.DeltaPos + 1;
            return Arr[Index];
        }
        else
        {
            
            return undefined;
        }
    };
    Engine.SetParamsNodeAddr = function (WasItem,NewItem)
    {
        if(WasItem.BlockNum < NewItem.BlockNum)
        {
            
            var Hash = Engine.GetAddrHashPOW(NewItem, NewItem.BlockNum, NewItem.Nonce);
            
            if(!WasItem.AddrHashPOW)
                WasItem.AddrHashPOW = Engine.GetAddrHashPOW(WasItem, WasItem.BlockNum, WasItem.Nonce);
            
            if(CompareArr(Hash, WasItem.AddrHashPOW) < 0)
            {
                
                WasItem.AddrHashPOW = Hash;
                WasItem.BlockNum = NewItem.BlockNum;
                WasItem.Nonce = NewItem.Nonce;
                return 1;
            }
        }
        
        return 0;
    };
    Engine.GetAddrHashPOW = function (AddrItem,BlockNum,Nonce)
    {
        var Hash = GetHashFromArrNum2(AddrItem.IDArr, BlockNum, Nonce);
        return Hash;
    };
    
    Engine.SetIP = function (ip)
    {
        Engine.ip = ip;
        if(Engine.ip === "0.0.0.0")
            return ;
        Engine.AddrItem = {IDArr:Engine.IDArr, ip:Engine.ip, port:Engine.port, Nonce:0, NonceTest:0, BlockNum:0, AddrHashPOW:[255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255]};
    };
    Engine.CaclNextAddrHashPOW = function (Count)
    {
        if(!Engine.AddrItem)
            return ;
        
        var BlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        var AddrItem = Engine.AddrItem;
        
        if(AddrItem.ip === "0.0.0.0")
            return ;
        
        for(var i = 0; i < Count; i++)
        {
            AddrItem.NonceTest++;
            var Hash = Engine.GetAddrHashPOW(AddrItem, BlockNum, AddrItem.NonceTest);
            if(CompareArr(Hash, AddrItem.AddrHashPOW) < 0)
            {
                AddrItem.AddrHashPOW = Hash;
                AddrItem.BlockNum = BlockNum;
                AddrItem.Nonce = AddrItem.NonceTest;
            }
        }
    };
    function GetArrByLevel(Level)
    {
        var Arr = Engine.NodesArrByLevel[Level];
        if(!Arr)
        {
            Arr = [];
            Arr.DeltaPos = 0;
            Engine.NodesArrByLevel[Level] = Arr;
        }
        return Arr;
    };
    Engine.IsCorrectNode = function (ip,port)
    {
        if(!port || port > 65535)
        {
            Engine.ToLog("Not correct port in address: " + ip, 3);
            return 0;
        }
        if(!ip)
        {
            Engine.ToLog("Not set address", 3);
            return 0;
        }
        
        var Arr = ip.match(/[\w\.]/g);
        if(!Arr || Arr.length !== ip.length)
        {
            Engine.ToLog("Not correct ip address: " + ip, 3);
            return 0;
        }
        
        if(JINN_CONST.UNIQUE_IP_MODE)
        {
            var CountPorts = Engine.GetCountPortsByIP(ip);
            if(CountPorts >= JINN_CONST.UNIQUE_IP_MODE)
                return 0;
        }
        return 1;
    };
    Engine.GetCountPortsByIP = function (ip)
    {
        var Count = 0;
        var find = {ip:ip, port:65535};
        var it = Engine.NodesTree.lowerBound(find);
        while(it)
        {
            it.prev();
            var item = it.data();
            if(!item || item.ip !== ip)
                break;
            
            Count++;
        }
        
        return Count;
    };
}


function InitAfter(Engine)
{
}


function GetHashFromNum2(Value1,Value2)
{
    var MeshArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    WriteUintToArrOnPos(MeshArr, Value1, 0);
    WriteUintToArrOnPos(MeshArr, Value2, 6);
    
    return sha3(MeshArr, 1);
}
function GetHashFromArrNum2(Arr,Value1,Value2)
{
    var MeshArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0];
    WriteArrToArrOnPos(MeshArr, Arr, 0, 32);
    WriteUintToArrOnPos(MeshArr, Value1, 32);
    WriteUintToArrOnPos(MeshArr, Value2, 38);
    
    return sha3(MeshArr, 2);
    
    function WriteArrToArrOnPos(arr,arr2,Pos,ConstLength)
    {
        for(var i = 0; i < ConstLength; i++)
        {
            arr[Pos + i] = arr2[i];
        }
    };
}

function XORArr(Arr1,Arr2)
{
    var Ret = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for(var i = 0; i < 32; i++)
    {
        Ret[i] = Arr1[i] ^ Arr2[i];
    }
    return Ret;
}

function FNodeAddr(a,b)
{
    if(a.ip < b.ip)
        return  - 1;
    else
        if(a.ip > b.ip)
            return  + 1;
        else
            return a.port - b.port;
}

function CalcIDArr(ip,port)
{
    var HostName = String(ip) + ":" + port;
    var IDArr = sha3(HostName, 3);
    return IDArr;
}

global.CalcIDArr = CalcIDArr;
global.FNodeAddr = FNodeAddr;

function ChildName(Child)
{
    if(!Child)
        return " none";
    
    var HostName = String(Child.ip) + ":" + Child.port;
    return HostName;
}
function IsLocalIP(addr)
{
    if(global.LOCAL_RUN)
        return 0;
    var addr7 = addr.substr(0, 7);
    if(addr === "127.0.0.1" || addr7 === "192.168" || (addr7 >= "100.64." && addr7 <= "100.127") || (addr7 >= "172.16." && addr7 <= "172.31.") || addr.substr(0,
    3) === "10.")
        return 1;
    else
        return 0;
}

global.ChildName = ChildName;
