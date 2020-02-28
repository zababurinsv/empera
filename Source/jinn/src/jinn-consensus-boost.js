/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * The module is designed to speed up the exchange
 * Proactive + batch sending of unique requests to all neighboring nodes at once
 * The implementation of the interception methods of sharing blocks and headers
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter});

var BROADCAST_SHORT_PERIOD = 1000;

global.glUseBHCache = 1;

//Engine context

function InitClass(Engine)
{
    
    Engine.GetHeaderArrForChild = function (BlockNum,Status,Child)
    {
        var Size = 0;
        var ArrRet = [];
        var LoadNum = Status.LoadN;
        var LoadHash = Status.LoadH;
        
        var CacheHeaderMap = Child.GetCache("CacheHeaderMap", BlockNum);
        
        for(var n = 0; n < Status.CountItem; n++)
        {
            if(!LoadHash || LoadNum < 0)
                break;
            var BlockHeader = Engine.GetHeaderForChild(LoadNum, LoadHash);
            if(!BlockHeader)
                break;
            LoadNum = BlockHeader.BlockNum - 1;
            LoadHash = BlockHeader.PrevSumHash;
            var StrHash = GetHexFromArr(BlockHeader.Hash);
            if(glUseBHCache && CacheHeaderMap[StrHash])
                continue;
            CacheHeaderMap[StrHash] = 1;
            
            ArrRet.push(BlockHeader);
            Size += BlockHeader.Size;
            if(Size >= JINN_CONST.MAX_BLOCK_SIZE)
            {
                break;
            }
        }
        
        return ArrRet;
    };
    
    Engine.GetBodyArrForChild = function (BlockNum,Status,Child)
    {
        
        var CacheBodyMap = Child.GetCache("CacheBodyMap", BlockNum);
        
        var SizeRet = 0;
        var ArrRet = [];
        var BlockBody = Engine.GetBodyForChild(Status.LoadN, Status.LoadH);
        if(BlockBody)
        {
            var StrHash = GetHexFromArr(BlockBody.TreeHash);
            if(!glUseBHCache || BlockBody.TxData && !CacheBodyMap[StrHash])
            {
                SizeRet = Engine.AddBodyBlockToArr(Child, ArrRet, BlockBody, SizeRet);
                CacheBodyMap[StrHash] = 1;
            }
            
            for(var n = 1; n < Status.CountItem; n++)
            {
                BlockBody = Engine.GetBodyByHash(BlockBody.BlockNum - 1, BlockBody.PrevSumHash);
                if(!BlockBody)
                    break;
                
                if(!BlockBody.TreeHash || !BlockBody.TxData || IsZeroArr(BlockBody.TreeHash))
                {
                    continue;
                }
                StrHash = GetHexFromArr(BlockBody.TreeHash);
                if(!glUseBHCache || !CacheBodyMap[StrHash])
                {
                    SizeRet = Engine.AddBodyBlockToArr(Child, ArrRet, BlockBody, SizeRet);
                    CacheBodyMap[StrHash] = 1;
                }
                if(SizeRet >= JINN_CONST.MAX_BLOCK_SIZE)
                {
                    break;
                }
            }
        }
        
        return ArrRet;
    };
    Engine.AddBodyBlockToArr = function (Child,Arr,BlockBody,Size)
    {
        if(!BlockBody.TxData || !BlockBody.TxData.length)
        {
            ToLogTrace("Error send block = " + BlockBody.BlockNum + " - NO TX BODY  BlockBody.TreeHash=" + BlockBody.TreeHash);
            return Size;
        }
        
        var TreeHashTest = Engine.CalcTreeHash(BlockBody.BlockNum, BlockBody.TxData);
        if(!IsEqArr(TreeHashTest, BlockBody.TreeHash))
        {
            Engine.ToLog("Error send block = " + BlockBody.BlockNum + " on AddBodyBlockToArr: TreeHash=" + TreeHashTest + "/" + BlockBody.TreeHash + "   " + BlockBody.Description);
            return Size;
        }
        
        var Item = {BlockNum:BlockBody.BlockNum, TxData:BlockBody.TxData};
        
        Arr.push(Item);
        Size += BlockBody.Size;
        
        JINN_STAT.BodyTxSend += Engine.ProcessBlockOnSend(Child, Item);
        
        return Size;
    };
    
    Engine.GetBodyByHash = function (BlockNum,Hash)
    {
        var Arr = Engine.GetBlockArrFromNum(BlockNum, 1);
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(Block && (IsEqArr(Block.Hash, Hash) || IsEqArr(Block.SumHash, Hash)))
            {
                if(Block.TxData && Block.TreeHash && !IsZeroArr(Block.TreeHash))
                    return Engine.GetBlockBody(Block, 1);
                else
                    return {PrevSumHash:Block.PrevSumHash, BlockNum:Block.BlockNum};
            }
        }
        return undefined;
    };
}

function InitAfter(Engine)
{
    
    Engine.StartSendLiderArr = function (BlockNum)
    {
        
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_MAXHASH))
            return ;
        
        var Context = {WasReturn:0};
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child && Child.IsOpen() && Child.IsHot())
            {
                Engine.SendMaxHashToOneNode(BlockNum, Child, Context, 30);
            }
        }
    };
    
    Engine.GetMaxArrForSend = function (Child,BlockNum,bNextSend)
    {
        var MaxTree = Child.GetCache("SendMaxTree", BlockNum, FMaxTreeCompare);
        
        var Store = Engine.GetStoreAtNum(BlockNum);
        var Arr = [];
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            
            var Element = {Mode:0, DataHash:NodeStatus.DataHash, MinerHash:NodeStatus.MinerHash, Hash:NodeStatus.Hash};
            
            if(NodeStatus.LoadNum)
            {
                Element.Mode = 1;
                Element.CountItem = Math.max(1, Math.min(JINN_CONST.MAX_ITEMS_FOR_LOAD, BlockNum - NodeStatus.LoadNum));
                Element.LoadN = NodeStatus.LoadNum;
                Element.LoadH = NodeStatus.LoadHash;
            }
            else
                if(NodeStatus.LoadTreeNum)
                {
                    Element.Mode = 2;
                    Element.CountItem = Math.max(1, Math.min(JINN_CONST.MAX_ITEMS_FOR_LOAD / 2, BlockNum - NodeStatus.LoadTreeNum));
                    Element.LoadN = NodeStatus.LoadTreeNum;
                    Element.LoadH = NodeStatus.LoadTreeHash;
                }
                else
                {
                    Element.Mode = 0;
                    Element.LoadN = 0;
                    Element.LoadH = ZERO_ARR_32;
                    Element.CountItem = 0;
                }
            
            var LoadHead = NodeStatus.LoadHead;
            if(Element.Mode && LoadHead)
            {
                var CurTime = Date.now();
                if(!LoadHead.TimeLoadH)
                    LoadHead.TimeLoadH = 0;
                if(bNextSend || CurTime - LoadHead.TimeLoadH > BROADCAST_SHORT_PERIOD || Element.CountItem <= 2)
                    LoadHead.TimeLoadH = CurTime;
                else
                {
                    Element.Mode = 0;
                    Element.CountItem = undefined;
                    Element.LoadN = undefined;
                    Element.LoadH = undefined;
                }
            }
            
            if(!bNextSend && Element.Mode && Element.CountItem)
                Element.CountItem = 1;
            if(MaxTree.find(Element))
                continue;
            var Element2 = {};
            CopyObjKeys(Element2, Element);
            MaxTree.insert(Element2);
            
            Arr.push(Element);
        }
        return Arr;
    };
    
    Engine.SendMaxHashToOneNode = function (BlockNum,Child,Context,IterationNum,bNext)
    {
        Child.SetLastCache(BlockNum);
        
        var Arr = Engine.GetMaxArrForSend(Child, BlockNum, bNext);
        if(!Arr.length)
        {
            return ;
        }
        
        Engine.ProcessMaxHashOnSend(Child, BlockNum, Arr);
        
        if(bNext)
            Engine.ToDebug("NEXT SEND " + BlockNum + " TO " + Child.ID + " I:" + IterationNum);
        
        if(!Child.FirstTransferTime)
            Child.FirstTransferTime = Date.now();
        Child.SendTransferTime = Date.now();
        
        Engine.Send("MAXHASH", Child, {Cache:Child.CurrentCache, BlockNum:BlockNum, Arr:Arr}, function (Child,Data)
        {
            if(!Data)
                return ;
            
            Child.TransferCount++;
            Child.DeltaTransfer = Date.now() - Child.SendTransferTime;
            
            Child.CheckCache(Data.Cache, BlockNum);
            var Store = Engine.GetStoreAtNum(BlockNum);
            if(!Store)
                return ;
            
            var bWas = 0;
            if(Data.Mode === 1)
                for(var n = 0; n < Data.Arr1.length; n++)
                {
                    var Value = Data.Arr1[n];
                    if(Value)
                    {
                        JINN_STAT.HeaderSend++;
                        Engine.AddBlockHeader(Child, Value, Store);
                        bWas = 1;
                    }
                }
            
            if(Data.Mode === 2)
                for(var n = 0; n < Data.Arr2.length; n++)
                {
                    var Value = Data.Arr2[n];
                    if(Value)
                    {
                        JINN_STAT.BodySend++;
                        Engine.AddBlockBody(Child, Value, Store);
                        bWas = 1;
                    }
                }
            
            if(bWas)
            {
                
                Engine.DoEventDB(Store);
                if(IterationNum <= 1)
                    return ;
                
                if(Context.WasReturn && Context.WasReturn !== Child)
                {
                    Child.ToDebug("WAS RETURN BY ANOTHER CHILD");
                    return ;
                }
                
                if(bWas)
                    Context.WasReturn = Child;
                var BlockNum2 = JINN_EXTERN.GetCurrentBlockNumByTime() - JINN_CONST.STEP_MAXHASH;
                Engine.SendMaxHashToOneNode(BlockNum2, Child, Context, IterationNum - 1, 1);
            }
        });
    };
    
    Engine.MAXHASH_SEND = {Cache:"uint", BlockNum:"uint", Arr:[{Mode:"byte", DataHashNum:"byte", DataHash:"zhash", MinerHash:"hash",
            CountItem:"uint16", LoadN:"uint", LoadH:"zhash"}], };
    Engine.MAXHASH_RET = {result:"byte", Cache:"uint", Mode:"byte", Arr1:[{BlockNum:"uint", LinkSumHash:"hash", TreeHash:"zhash",
            MinerHash:"hash", PrevSumHash:"hash"}], Arr2:[{BlockNum:"uint", TxTransfer:[{Index:"uint16", body:"tr"}], TTTransfer:["arr" + JINN_CONST.TX_TICKET_HASH_LENGTH],
            TxReceive:["uint16"], TxSend:["uint16"]}]};
    Engine.MAXHASH = function (Child,Data)
    {
        var BlockNum = Data.BlockNum;
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_MAXHASH))
            return ;
        
        Child.LastTransferTime = Date.now();
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot() || Child.HotStart)
            return ;
        if(Data.Arr.length > JINN_CONST.MAX_LEADER_COUNT)
            Data.Arr.length = JINN_CONST.MAX_LEADER_COUNT;
        
        Child.CheckCache(Data.Cache, BlockNum);
        if(!Engine.ProcessMaxHashOnReceive(Child, BlockNum, Data.Arr))
            return ;
        
        var RetArr1 = [];
        var RetArr2 = [];
        var RetMode = 0;
        
        for(var i = 0; i < Data.Arr.length; i++)
        {
            var Status = Data.Arr[i];
            Engine.AddHashToMaxLider(Status, Data.BlockNum, 0);
            if(RetMode || !Status.Mode || !Status.LoadN)
                continue;
            
            if(i > 0 && Data.BlockNum - Status.LoadN > JINN_CONST.MAX_DEPTH_FOR_SECONDARY_CHAIN)
                continue;
            
            if(Status.Mode === 1)
            {
                RetArr1 = Engine.GetHeaderArrForChild(Data.BlockNum, Status, Child);
                if(RetArr1.length)
                    RetMode = 1;
            }
            else
                if(Status.Mode === 2)
                {
                    RetArr2 = Engine.GetBodyArrForChild(Data.BlockNum, Status, Child);
                    if(RetArr2.length)
                        RetMode = 2;
                }
        }
        
        return {result:1, Cache:Child.CurrentCache, Mode:RetMode, Arr1:RetArr1, Arr2:RetArr2};
    };
}

function FMaxTreeCompare(Val1,Val2)
{
    if(Val1.Mode !== Val2.Mode)
        return Val1.Mode - Val2.Mode;
    if(Val1.CountItem !== Val2.CountItem)
        return Val1.CountItem - Val2.CountItem;
    if(Val1.LoadN !== Val2.LoadN)
        return Val1.LoadN - Val2.LoadN;
    
    var Comp1 = CompareArr(Val1.DataHash, Val2.DataHash);
    if(Comp1)
        return Comp1;
    var Comp2 = CompareArr(Val1.MinerHash, Val2.MinerHash);
    if(Comp2)
        return Comp2;
    
    if(Val1.Mode !== Val2.Mode)
        return Val1.Mode - Val2.Mode;
    if(Val1.Mode !== Val2.Mode)
        return Val1.Mode - Val2.Mode;
    
    var LoadH1 = Val1.LoadH;
    if(!LoadH1)
        LoadH1 = ZERO_ARR_32;
    var LoadH2 = Val2.LoadH;
    if(!LoadH2)
        LoadH2 = ZERO_ARR_32;
    
    return CompareArr(LoadH1, LoadH2);
}

function EqArrMaxHash(a,b)
{
    if(a.length !== b.length)
        return 0;
    
    for(var i = 0; i < a.length; i++)
    {
        if(FMaxTreeCompare(a[i], b[i]))
            return 0;
    }
    return 1;
}
