/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter});
global.glUseBlockCache = 1;
global.glUsePackMaxHash = 1;
function InitClass(Engine)
{
    Engine.ProcessBlockOnSend = function (Child,Block)
    {
        if(!global.glUseBlockCache)
            return Block.TxData.length;
        var BlockNum = Block.BlockNum;
        var DeltaBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime() - BlockNum;
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
        if(global.JINN_WARNING >= 3)
        {
            var Arr2 = Engine.GetUnpackedArray(Block.TxReceive);
            if(!IsEqArr(Arr2, TxReceive))
                throw "Error PackedArray TxReceive";
            var Arr3 = Engine.GetUnpackedArray(Block.TxSend);
            if(!IsEqArr(Arr3, TxSend))
                throw "Error PackedArray TxSend";
        }
        delete Block.TxData;
        return Block.TxTransfer.length;
    };
    Engine.ProcessBlockOnReceive = function (Child,Block)
    {
        if(!global.glUseBlockCache)
            return 1;
        Block.TxData = [];
        var BlockNum = Block.BlockNum;
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
            var TreeTX = Engine.ListTreeTx[BlockNum];
            var Tx;
            for(var i = 0; i < Block.TTTransfer.length; i++)
            {
                var HashTicket = Block.TTTransfer[i];
                var KeyTicket = GetHexFromArr(HashTicket);
                var Tt = Engine.GetTicket(HashTicket, KeyTicket, BlockNum);
                if(TreeTX)
                    Tx = TreeTX.find(Tt);
                else
                    Tx = undefined;
                if(!Tx || !CheckTx("" + Engine.ID + ". #2 ProcessBlockOnReceive", Tx, BlockNum, 1))
                {
                    if(global.JINN_WARNING >= 2)
                        Engine.ToLog("<-" + Child.ID + " Bad cache version: " + Child.CahcheVersion + " Key=" + KeyTicket + " . DO INCREMENT, TT: " + ChildMap.ReceiveTicketMap[KeyTicket] + "/" + ChildMap.SendTicketMap[KeyTicket]);
                    Child.CahcheVersion++;
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
                if(global.JINN_WARNING >= 2)
                    Engine.ToLog("<-" + Child.ID + " Bad cache version: " + Child.CahcheVersion + " Index=" + Index + " . DO INCREMENT");
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
                if(global.JINN_WARNING >= 2)
                    Engine.ToLog("<-" + Child.ID + " Bad cache version: " + Child.CahcheVersion + " Index=" + Index + " . DO INCREMENT");
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
            return ;
        var ChildMap = Child.GetCacheByBlockNum(BlockNum);
        var Map = ChildMap.SendHashMap;
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            var StrDataHash = GetHexFromArr(Status.DataHash);
            if(Map[StrDataHash])
            {
                Status.DataHashNum = Map[StrDataHash];
                Status.DataHash = ZERO_ARR_32;
            }
            else
            {
                ChildMap.SendHashIndex++;
                Map[StrDataHash] = ChildMap.SendHashIndex;
            }
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
        var ChildMap = Child.GetCacheByBlockNum(BlockNum);
        var ArrHash = ChildMap.ReceiveHashArr;
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            if(Status.DataHashNum)
            {
                if(ArrHash.length < Status.DataHashNum)
                {
                    Engine.ToDebug("*****************Error got hash num=" + Status.DataHashNum);
                    return 0;
                }
                var DataHash = ArrHash[Status.DataHashNum - 1];
                Status.DataHash = DataHash;
            }
            else
            {
                ArrHash.push(Status.DataHash);
            }
            if(Status.Mode & 128)
            {
                Status.Mode ^= 128;
                Engine.CalcHashMaxLider(Status, BlockNum, 0);
                Status.LoadH = Status.Hash;
            }
        }
        return 1;
    };
    Engine.InitChildNext = function (Child)
    {
        Child.CacheAll = {};
        Child.CacheBlockNumAll = {};
        Child.CahcheVersion = 0;
        Child.GetCache = function (Name,BlockNum,FTreeSort)
        {
            var ChildCache = Child.GetCacheByBlockNum((BlockNum / 1) >>> 0);
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
            var Map = Child.CacheBlockNumAll[BlockNum];
            if(!Map)
            {
                Map = {};
                Map.ReceiveTicketMap = {};
                Map.SendTicketMap = {};
                Map.SendHashMap = {};
                Map.ReceiveHashArr = [];
                Map.SendHashIndex = 0;
                Child.CacheBlockNumAll[BlockNum] = Map;
            }
            return Map;
        };
        Child.SetCache = function (Version,BlockNum)
        {
            if(typeof Version !== "number")
                throw "SetCache:Error type Version";
            if(typeof BlockNum !== "number")
                throw "SetCache:Error type BlockNum";
            Child.CurrentCache = Version;
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
            Child.CurrentCacheMap = Map.Cache;
            Child.CurrentCacheMapNum = Map.ByBlockNum;
            var Map2 = Map.ByBlockNum[BlockNum];
            if(!Map2)
            {
                Map2 = {};
                Map2.ReceiveTxMap = {};
                Map2.SendTxMap = {};
                Map2.ReceiveTxArr = [];
                Map2.SendTxArr = [];
                Child.CurrentCacheMapNum[BlockNum] = Map2;
            }
            Child.CreateCacheTime = Map.CreateCacheTime;
            Child.ReceiveTxMap = Map2.ReceiveTxMap;
            Child.SendTxMap = Map2.SendTxMap;
            Child.ReceiveTxArr = Map2.ReceiveTxArr;
            Child.SendTxArr = Map2.SendTxArr;
        };
        Child.CheckCache = function (Version,BlockNum)
        {
            Child.SetCache(Version, BlockNum);
            if(Version > Child.CahcheVersion)
                Child.CahcheVersion = Version;
        };
        Child.SetLastCache = function (BlockNum)
        {
            Child.SetCache(Child.CahcheVersion, BlockNum);
        };
        Child.InvalidateOldBlockNumCache = function ()
        {
            var LastBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
            for(var key in Child.CacheBlockNumAll)
            {
                var BlockNum =  + key;
                if(LastBlockNum - BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                    continue;
                delete Child.CacheBlockNumAll[key];
            }
            if(!Engine.CanHistoryClear())
                return ;
            if(Child.CurrentCacheMapNum)
                for(var key in Child.CurrentCacheMapNum)
                {
                    var BlockNum =  + key;
                    if(LastBlockNum - BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                        continue;
                    delete Child.CurrentCacheMapNum[key];
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
                var Delta = CurDate - Map.CacheTime;
                if(!Map.CacheTime)
                    throw "Error Map.CacheTime";
                if(Map.CacheVersion === Child.CahcheVersion)
                    continue;
                if(Delta > JINN_CONST.CACHE_PERIOD_FOR_INVALIDATE * 1000)
                {
                    delete Child.CacheAll[key];
                }
            }
        };
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
            return ;
        if(Tx.Index === undefined)
            throw "Error Tx.Index";
        var Index = Tx.Index;
        Child.ReceiveTxMap[Tx.KEY] = Index;
        Child.ReceiveTxArr[Index] = Tx;
        return Index;
    };
}
