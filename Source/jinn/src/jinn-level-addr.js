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
global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter, DoNode:DoNode, Name:"Addr"});
const POW_MEMORY_BIT_SIZE = 18;
const POW_MAX_ITEM_IN_MEMORRY = 1 << POW_MEMORY_BIT_SIZE;
const POW_SHIFT_MASKA = 32 - POW_MEMORY_BIT_SIZE;
var COUNT_LIST_LOOP = 3;
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
        if(!Child || Child.Del || !Child.Active)
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
                    if(Engine.AddNodeAddr(Item))
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
                Engine.CaclNextAddrHashPOW(1);
                Arr.push(Engine.AddrItem);
            }
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
    Engine.GetCountAddr = function (AddrItem)
    {
        var Tree = Engine.NodesTree;
        return Tree.size;
    };
    Engine.AddNodeAddr = function (AddrItem)
    {
        var HostName = String(AddrItem.ip) + ":" + AddrItem.port;
        AddrItem.IDArr = sha3(HostName);
        var Tree = Engine.NodesTree;
        var Find = Tree.find(AddrItem);
        if(Find)
        {
            Engine.SetParamsNodeAddr(Find, AddrItem);
            return 0;
        }
        var Level = Engine.AddrLevelArr(Engine.IDArr, AddrItem.IDArr, 1);
        var Arr = GetArrByLevel(Level);
        if(Arr.length >= JINN_CONST.MAX_LEVEL_NODES)
            return 0;
        Tree.insert(AddrItem);
        Arr.push(AddrItem);
        if(AddrItem.ip === Engine.ip && AddrItem.port === Engine.port)
            AddrItem.Self = 1;
        if(AddrItem.ip === JINN_EXTERN.NodeRoot.ip && AddrItem.port === JINN_EXTERN.NodeRoot.port)
            AddrItem.ROOT_NODE = 1;
        return 1;
    };
    Engine.GetNextNodeAddr = function (Iterator,RecurcionNum)
    {
        var Level = Iterator.Level % JINN_CONST.MAX_LEVEL_CONNECTION;
        Iterator.Level = Level + 1;
        var Index = Iterator.Arr[Level];
        if(!Index)
            Index = 0;
        var Arr = GetArrByLevel(Level);
        if(Arr.length > Index)
        {
            Iterator.Arr[Level] = Index + 1;
            return Arr[Index];
        }
        else
        {
            Iterator.Arr[Level] = Arr.length;
            return undefined;
        }
    };
    Engine.GetAddrHashPOW = function (AddrItem,BlockNum,Nonce)
    {
        var HashBase = GetHashFromNum2(BlockNum, 0);
        var HashNonce = GetHashFromArrNum2(AddrItem.IDArr, Nonce, 0);
        var Hash = XORArr(HashBase, HashNonce);
        var PowerNonce = GetPowPowerFromEnd(HashNonce);
        ShiftArr(Hash, PowerNonce);
        return Hash;
    };
    Engine.SetParamsNodeAddr = function (WasItem,NewItem)
    {
        if(WasItem.BlockNum < NewItem.BlockNum)
        {
            var BlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
            var DeltaBlockNum = BlockNum - NewItem.BlockNum;
            if(DeltaBlockNum < 0 || DeltaBlockNum > JINN_CONST.MAX_DELTA_BLOCKNUM_POW)
                return ;
            var Hash = Engine.GetAddrHashPOW(NewItem, NewItem.BlockNum, NewItem.Nonce);
            if(!WasItem.AddrHashPOW)
                WasItem.AddrHashPOW = Engine.GetAddrHashPOW(WasItem, WasItem.BlockNum, WasItem.Nonce);
            if(BlockNum - WasItem.BlockNum > JINN_CONST.MAX_DELTA_BLOCKNUM_POW || CompareArr(Hash, WasItem.AddrHashPOW) < 0)
            {
                WasItem.AddrHashPOW = Hash;
                WasItem.BlockNum = NewItem.BlockNum;
                WasItem.Nonce = NewItem.Nonce;
            }
        }
    };
    Engine.CaclNextAddrHashPOW = function (Count)
    {
        var BlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        if(!Engine.AddrItem || BlockNum - Engine.AddrItem.BlockNum >= JINN_CONST.MAX_DELTA_BLOCKNUM_POW / 2)
        {
            Engine.AddrItem = {IDArr:Engine.IDArr, ip:Engine.ip, port:Engine.port, Nonce:0, NonceTest:0, BlockNum:0, AddrHashPOW:[255,
                255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
                255, 255, 255, 255, 255, 255]};
        }
        var AddrItem = Engine.AddrItem;
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
    Engine.FindNextAddrHashPOW = function (Count)
    {
        var BlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        if(!Engine.AddrItemMem)
        {
            Engine.AddrItemMem = new Uint32Array(POW_MAX_ITEM_IN_MEMORRY);
            Engine.AddrItemNonce = 0;
        }
        if(!Engine.AddrItem)
        {
            Engine.AddrItem = {IDArr:Engine.IDArr, ip:Engine.ip, port:Engine.port, Nonce:0, BlockNum:0, AddrHashPOW:[255, 255, 255, 255,
                255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
                255, 255, 255]};
        }
        Engine.FillMemAddrHashPOW(Count);
        var HashBase = GetHashFromNum2(BlockNum, 0);
        var HashNum = (HashBase[0] << 23) * 2 + (HashBase[1] << 16) + (HashBase[2] << 8) + HashBase[3];
        HashNum = HashNum >>> POW_SHIFT_MASKA;
        var Nonce = Engine.AddrItemMem[HashNum];
        if(!Nonce)
            return ;
        var Hash = Engine.GetAddrHashPOW(Engine.AddrItem, BlockNum, Nonce);
        if(CompareArr(Hash, Engine.AddrItem.AddrHashPOW) < 0 || BlockNum - Engine.AddrItem.BlockNum >= JINN_CONST.MAX_DELTA_BLOCKNUM_POW / 2)
        {
            Engine.AddrItem.AddrHashPOW = Hash;
            Engine.AddrItem.BlockNum = BlockNum;
            Engine.AddrItem.Nonce = Nonce;
        }
    };
    Engine.FillMemAddrHashPOW = function (Count)
    {
        if(Engine.AddrItemNonce >= 4 * 1000 * 1000 * 1000)
            return ;
        var WasCount = 0;
        for(var i = 0; i < Count; i++)
        {
            Engine.AddrItemNonce++;
            var HashNonce = GetHashFromArrNum2(Engine.IDArr, Engine.AddrItemNonce, 0);
            var PowerNonce = GetPowPowerFromEnd(HashNonce);
            var HashNum = (HashNonce[0] << 23) * 2 + (HashNonce[1] << 16) + (HashNonce[2] << 8) + HashNonce[3];
            HashNum = HashNum >>> POW_SHIFT_MASKA;
            if(Engine.AddrItemMem[HashNum])
            {
                WasCount++;
                if(WasCount >= 20)
                    break;
            }
            else
            {
                WasCount = 0;
            }
            Engine.AddrItemMem[HashNum] = Engine.AddrItemNonce;
        }
    };
    function GetArrByLevel(Level)
    {
        var Arr = Engine.NodesArrByLevel[Level];
        if(!Arr)
        {
            Arr = [];
            Engine.NodesArrByLevel[Level] = Arr;
        }
        return Arr;
    };
    function GetPowPowerFromEnd(arrhash)
    {
        var SumBit = 0;
        for(var i = arrhash.length - 1; i >= 0; i--)
        {
            var byte = arrhash[i];
            for(var b = 0; b < 8; b++)
            {
                if((byte >> b) & 1)
                {
                    return SumBit;
                }
                else
                {
                    SumBit++;
                }
            }
        }
        return SumBit;
    };
    function ShiftArr(arrhash,ShiftCount)
    {
        while(ShiftCount > 7)
        {
            ShiftCount -= 8;
            arrhash.unshift(0);
            arrhash.length--;
        }
        if(!ShiftCount)
            return ;
        var oldbyte = 0;
        for(var i = 0; i < arrhash.length; i++)
        {
            var byte = arrhash[i];
            var newbyte = byte >>> ShiftCount;
            arrhash[i] = newbyte | oldbyte;
            oldbyte = (byte << (8 - ShiftCount)) & 255;
        }
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
    return sha3(MeshArr);
}
function GetHashFromArrNum2(Arr,Value1,Value2)
{
    var MeshArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0];
    WriteArrToArrOnPos(MeshArr, Arr, 0, 32);
    WriteUintToArrOnPos(MeshArr, Value1, 32);
    WriteUintToArrOnPos(MeshArr, Value2, 38);
    return sha3(MeshArr);
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
global.FNodeAddr = FNodeAddr;
