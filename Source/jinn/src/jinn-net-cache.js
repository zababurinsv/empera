/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter, DoNode:DoNode, Name:"NetCache"});


//Engine context



global.glUseBlockCache = 1;
global.glUsePackMaxHash = 1;

function DoNode(Engine)
{
    var BlockNum = JINN_EXTERN.GetCurrentBlockNumByTime() - JINN_CONST.STEP_CLEAR_MEM;
    if(Engine.CacheLastCurBlockNum === BlockNum)
        return;
    Engine.CacheLastCurBlockNum = BlockNum;
    
    Engine.NetCacheClear();
}

function InitClass(Engine)
{
    Engine.ProcessBlockOnSend = function (Child,Block)
    {
        var BlockNum = Block.BlockNum;
        var DeltaBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime() - BlockNum;
        
        if(!global.glUseBlockCache || DeltaBlockNum >= JINN_CONST.STEP_CLEAR_MEM - JINN_CONST.MAX_DELTA_PROCESSING)
            return Block.TxData.length;
        Block.TxTransfer = [];
        Block.TTTransfer = [];
        var TxReceive = [];
        var TxSend = [];
        
        var TreeTX = Engine.ListTreeTx[BlockNum];
        var ChildMap = Child.GetCacheByBlockNum(BlockNum);
        var DeltaTime = Date.now() - Child.CreateCacheTime;
        
        for(var i = 0; i < Block.TxData.length; i++)
        {
            var Tx = Block.TxData[i];
            Engine.CheckHashExist(Tx);
            CheckTx("ProcessBlockOnSend", Tx, BlockNum);
            
            var TxIndexSend = Child.SendTxMap[Tx.KEY];
            if(TxIndexSend !== undefined)
                TxSend.push(TxIndexSend);
            else
            {
                var TxIndexReceive = Child.ReceiveTxMap[Tx.KEY];
                if(TxIndexReceive !== undefined)
                    TxReceive.push(TxIndexReceive);
                else
                {
                    if(global.glUseTicket && DeltaTime >= 5 * 1000 && DeltaBlockNum <= JINN_CONST.STEP_LAST && TreeTX && TreeTX.find(Tx) && (ChildMap.ReceiveTicketMap[Tx.KEY] || ChildMap.SendTicketMap[Tx.KEY]))
                    {
                        Block.TTTransfer.push(Tx.HashTicket);
                    }
                    else
                    {
                        Engine.AddTxToSendCache(Child, BlockNum, Tx);
                        Block.TxTransfer.push({Index:Tx.Index, body:Tx.body});
                    }
                }
            }
        }
        Block.TxReceive = Engine.GetPackedArray(TxReceive);
        Block.TxSend = Engine.GetPackedArray(TxSend);
        
        if(global.JINN_WARNING >= 4)
        {
            var Arr2 = Engine.GetUnpackedArray(Block.TxReceive);
            if(!IsEqArr(Arr2, TxReceive))
                ToLogTrace("Error PackedArray TxReceive");
            var Arr3 = Engine.GetUnpackedArray(Block.TxSend);
            if(!IsEqArr(Arr3, TxSend))
                ToLogTrace("Error PackedArray TxSend");
        }
        
        delete Block.TxData;
        
        return Block.TxTransfer.length;
    };
    
    Engine.ProcessBlockOnReceive = function (Child,Block)
    {
        var BlockNum = Block.BlockNum;
        if(!global.glUseBlockCache || Block.TxData.length)
        {
            for(var i = 0; i < Block.TxData.length; i++)
            {
                var Value = Block.TxData[i];
                var Tx = Engine.GetTx(Value.body);
                Block.TxData[i] = Tx;
                
                CheckTx("" + Engine.ID + ". #1 ProcessBlockOnReceive", Tx, BlockNum);
            }
            
            return 1;
        }
        
        Block.TxData = [];
        for(var i = 0; i < Block.TxTransfer.length; i++)
        {
            var Value = Block.TxTransfer[i];
            var Tx = Engine.GetTx(Value.body);
            Tx.Index = Value.Index;
            
            CheckTx("" + Engine.ID + ". #1 ProcessBlockOnReceive", Tx, BlockNum);
            
            Block.TxData.push(Tx);
            Engine.AddTxToReceiveCache(Child, BlockNum, Tx, 1);
        }
        if(Block.TTTransfer.length)
        {
            var ChildMap = Child.GetCacheByBlockNum(BlockNum);
            var TreeTX = Engine.GetTreeTx(BlockNum);
            var TreeAll = Engine.GetTreeTicketAll(BlockNum);
            
            var Tx;
            for(var i = 0; i < Block.TTTransfer.length; i++)
            {
                var HashTicket = Block.TTTransfer[i];
                var KeyTicket = GetHexFromArr(HashTicket);
                
                var TItem = TreeAll.find({Hash:HashTicket});
                if(TItem)
                    Tx = TItem.Tx;
                
                if(!Tx || !CheckTx("" + Engine.ID + ". #2 ProcessBlockOnReceive", Tx, BlockNum, 1))
                {
                    if(global.JINN_WARNING >= 4)
                        Engine.ToWarning("<-" + Child.ID + " Bad cache version: " + Child.CahcheVersion + " Key=" + KeyTicket, 1);
                    return 0;
                }
                Block.TxData.push(Tx);
            }
        }
        
        var TxReceive = Engine.GetUnpackedArray(Block.TxReceive);
        var TxSend = Engine.GetUnpackedArray(Block.TxSend);
        for(var i = 0; i < TxReceive.length; i++)
        {
            var Index = TxReceive[i];
            var Tx = Child.SendTxArr[Index];
            if(!Tx || !CheckTx("" + Engine.ID + ". #3 ProcessBlockOnReceive", Tx, BlockNum, 1))
            {
                if(global.JINN_WARNING >= 4)
                    Engine.ToWarning("<-" + Child.ID + " Bad cache version: " + Child.CahcheVersion + " Index=" + Index + " . DO INCREMENT", 3);
                Child.CahcheVersion++;
                return 0;
            }
            Block.TxData.push(Tx);
        }
        
        for(var i = 0; i < TxSend.length; i++)
        {
            var Index = TxSend[i];
            var Tx = Child.ReceiveTxArr[Index];
            if(!Tx || !CheckTx("" + Engine.ID + ". #4 ProcessBlockOnReceive", Tx, BlockNum, 1))
            {
                if(global.JINN_WARNING >= 4)
                    Engine.ToWarning("<-" + Child.ID + " Bad cache version: " + Child.CahcheVersion + " Index=" + Index + " . DO INCREMENT", 3);
                Child.CahcheVersion++;
                
                return 0;
            }
            Block.TxData.push(Tx);
        }
        
        delete Block.TTTransfer;
        delete Block.TxTransfer;
        delete Block.TxReceive;
        delete Block.TxSend;
        
        return 1;
    };
    
    Engine.GetUnpackedArray = function (Arr)
    {
        var Arr2 = [];
        if(Arr.length / 2 === (Arr.length >> 1))
            for(var i = 0; i < Arr.length; i += 2)
            {
                var Value = Arr[i];
                var Count = Arr[i + 1];
                for(var n = 0; n < Count; n++)
                    Arr2.push(Value + n);
            }
        
        return Arr2;
    };
    
    Engine.GetPackedArray = function (Arr)
    {
        Arr.sort(function (a,b)
        {
            return a - b;
        });
        var Arr2 = [];
        var Counter = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Value = Arr[i];
            var Value2 = Arr[i + 1];
            
            Counter++;
            if(Value + 1 === Value2)
            {
            }
            else
            {
                Arr2.push(Value - Counter + 1);
                Arr2.push(Counter);
                
                Counter = 0;
            }
        }
        return Arr2;
    };
    
    Engine.ProcessMaxHashOnSend = function (Child,BlockNum,Arr)
    {
        if(!glUsePackMaxHash)
            return;
        
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            if(Status.LoadH && IsEqArr(Status.LoadH, Status.Hash))
            {
                Status.Mode |= 128;
                Status.LoadH = ZERO_ARR_32;
            }
        }
    };
    
    Engine.ProcessMaxHashOnReceive = function (Child,BlockNum,Arr)
    {
        if(!glUsePackMaxHash)
            return 1;
        
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            if(Status.Mode & 128)
            {
                Status.Mode ^= 128;
                Engine.CalcHashMaxLider(Status, BlockNum);
                Status.LoadH = Status.Hash;
            }
        }
        return 1;
    };
    
    Engine.InitChildNext = function (Child)
    {
        
        Child.CacheAll = {};
        
        Child.CahcheVersion = 0;
        Child.GetCache = function (Name,BlockNum,FTreeSort)
        {
            
            var ChildCache = Child.GetCacheByBlockNum(BlockNum);
            var Map = ChildCache[Name];
            if(!Map)
            {
                if(FTreeSort)
                    Map = new RBTree(FTreeSort);
                else
                    Map = {};
                
                ChildCache[Name] = Map;
            }
            
            return Map;
        };
        
        Child.GetCacheByBlockNum = function (BlockNum)
        {
            var Map = Child.CurrentCacheMapNum[BlockNum];
            if(!Map)
            {
                Child.SetCacheNum(Child.CurrentCacheVersion, BlockNum);
                Map = Child.CurrentCacheMapNum[BlockNum];
            }
            return Map;
        };
        
        Child.SetCacheNum = function (Version,BlockNum)
        {
            if(typeof Version !== "number")
                throw "SetCacheNum:Error type Version";
            if(typeof BlockNum !== "number")
                throw "SetCacheNum:Error type BlockNum";
            
            Child.CurrentCacheVersion = Version;
            
            var Map = Child.CacheAll[Version];
            if(!Map)
            {
                Map = {};
                Map.CacheVersion = Version;
                Map.ByBlockNum = {};
                Map.Cache = {};
                Map.CreateCacheTime = Date.now();
                Child.CacheAll[Version] = Map;
            }
            Map.CacheTime = Date.now();
            
            var Map2 = Map.ByBlockNum[BlockNum];
            if(!Map2)
            {
                Map2 = {};
                Map2.ReceiveTxMap = {};
                Map2.SendTxMap = {};
                Map2.ReceiveTxArr = [];
                Map2.SendTxArr = [];
                
                Map2.ReceiveTicketMap = {};
                Map2.SendTicketMap = {};
                Map2.SendHashMap = {};
                Map2.ReceiveHashArr = [];
                Map2.SendHashIndex = 0;
                
                Map.ByBlockNum[BlockNum] = Map2;
            }
            
            Child.CurrentCacheMap = Map.Cache;
            Child.CurrentCacheMapNum = Map.ByBlockNum;
            
            Child.CreateCacheTime = Map.CreateCacheTime;
            Child.ReceiveTxMap = Map2.ReceiveTxMap;
            Child.SendTxMap = Map2.SendTxMap;
            Child.ReceiveTxArr = Map2.ReceiveTxArr;
            Child.SendTxArr = Map2.SendTxArr;
        };
        
        Child.CheckCache = function (Version,BlockNum)
        {
            Child.SetCacheNum(Version, BlockNum);
            if(Version > Child.CahcheVersion)
                Child.CahcheVersion = Version;
        };
        Child.SetLastCache = function (BlockNum)
        {
            Child.SetCacheNum(Child.CahcheVersion, BlockNum);
        };
        Child.InvalidateOldBlockNumCache = function ()
        {
            var LastBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
            if(Child.CacheBlockNumAll)
            {
                for(var key in Child.CacheBlockNumAll)
                {
                    var BlockNum =  + key;
                    if(LastBlockNum - BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                        continue;
                    delete Child.CacheBlockNumAll[key];
                }
            }
            if(Child.CurrentCacheMapNum)
            {
                for(var key in Child.CurrentCacheMapNum)
                {
                    var BlockNum =  + key;
                    if(LastBlockNum - BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                        continue;
                    delete Child.CurrentCacheMapNum[key];
                }
            }
        };
        Child.InvalidateOldChildCache = function ()
        {
            
            var CurDate = Date.now();
            for(var key in Child.CacheAll)
            {
                var Map = Child.CacheAll[key];
                if(!Map)
                    continue;
                
                if(!Map.CacheTime)
                {
                    ToLogTrace("Error Map.CacheTime");
                    continue;
                }
                
                var Delta = CurDate - Map.CacheTime;
                
                if(Map.CacheVersion === Child.CahcheVersion)
                    continue;
                
                if(Delta > JINN_CONST.CACHE_PERIOD_FOR_INVALIDATE * 1000)
                {
                    delete Child.CacheAll[key];
                }
            }
        };
    };
    Engine.NetCacheClear = function ()
    {
        var LastBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        ClearListTree(Engine.ListTreeTx, LastBlockNum);
        ClearListTree(Engine.ListTreeTicket, LastBlockNum);
        ClearListTree(Engine.ListTreeTicketAll, LastBlockNum);
        for(var key in Engine.MaxLiderList)
        {
            var Store = Engine.MaxLiderList[key];
            if(LastBlockNum - Store.BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                continue;
            delete Engine.MaxLiderList[key];
        }
        
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child)
            {
                Child.InvalidateOldChildCache();
                Child.InvalidateOldBlockNumCache();
            }
        }
    };
    function ClearListTree(Tree,LastBlockNum)
    {
        if(!Tree)
            return;
        for(var key in Tree)
        {
            var BlockNum =  + key;
            if(LastBlockNum - BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                continue;
            
            var Value = Tree[key];
            Value.clear();
            delete Tree[key];
        }
    };
}

function InitAfter(Engine)
{
    Engine.FindInCache = function (Child,BlockNum,Tx)
    {
        if(Child.ReceiveTxMap[Tx.KEY] === undefined && Child.SendTxMap[Tx.KEY] === undefined)
            return 0;
        else
            return 1;
    };
    
    Engine.AddTxToSendCache = function (Child,BlockNum,Tx)
    {
        var Index = Child.SendTxMap[Tx.KEY];
        if(Index === undefined)
        {
            Index = Child.SendTxArr.length;
            Child.SendTxArr.push(Tx);
            Child.SendTxMap[Tx.KEY] = Index;
        }
        Tx.Index = Index;
        return Index;
    };
    Engine.AddTxToReceiveCache = function (Child,BlockNum,Tx,bCheck)
    {
        if(Child.ReceiveTxMap[Tx.KEY] !== undefined)
            return;
        
        if(Tx.Index === undefined)
            throw "Error Tx.Index";
        
        var Index = Tx.Index;
        Child.ReceiveTxMap[Tx.KEY] = Index;
        Child.ReceiveTxArr[Index] = Tx;
        
        return Index;
    };
}
