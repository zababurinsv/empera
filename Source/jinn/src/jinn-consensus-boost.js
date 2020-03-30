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
global.JINN_MODULES.push({InitClass:InitClass, Name:"ConsensusBoost"});

var BROADCAST_SHORT_PERIOD = 1000;

global.TEST_CONSENSUS_BOOST = 0;

global.glUseBHCache = 1;
global.glUseMaxCache = 1;

global.MAX_ITERATION_MAX_HASH = 20;

//Engine context

function InitClass(Engine)
{
    
    Engine.StartSendLiderArr = function (BlockNum)
    {
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_MAXHASH))
            return;
        
        let Context = {WasReturn:0};
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child && Child.IsOpen() && Child.IsHot())
            {
                Engine.SendMaxHashToOneNode(BlockNum, Child, Context, MAX_ITERATION_MAX_HASH);
            }
        }
    };
    
    Engine.GetMaxArrForSend = function (Child,BlockNum,bNextSend)
    {
        var MaxTree = Child.GetCache("SendMaxTree", BlockNum, FMaxTreeCompare);
        
        var Store = Engine.GetLiderArrAtNum(BlockNum);
        var Arr = [];
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            
            var Element = {Mode:0, DataHash:NodeStatus.DataHash, LinkSumHash:NodeStatus.LinkSumHash, TreeHash:NodeStatus.TreeHash, MinerHash:NodeStatus.MinerHash,
                Hash:NodeStatus.Hash};
            
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
                    Element.CountItem = Math.max(1, Math.min(JINN_CONST.MAX_ITEMS_FOR_LOAD, BlockNum - NodeStatus.LoadTreeNum));
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
            
            var LoadBlockHead = NodeStatus.LoadBlockHead;
            if(Element.Mode && LoadBlockHead)
            {
                var CurTime = Date.now();
                if(!LoadBlockHead.TimeLoadH)
                    LoadBlockHead.TimeLoadH = 0;
                if(bNextSend || CurTime - LoadBlockHead.TimeLoadH > BROADCAST_SHORT_PERIOD || Element.CountItem <= 2)
                    LoadBlockHead.TimeLoadH = CurTime;
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
            if(global.glUseMaxCache)
            {
                if(MaxTree.find(Element))
                    continue;
                var Element2 = {};
                CopyObjKeys(Element2, Element);
                MaxTree.insert(Element2);
            }
            
            Arr.push(Element);
        }
        return Arr;
    };
    
    Engine.SendMaxHashToOneNode = function (BlockNum,Child,Context,IterationNum,bNext)
    {
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_MAXHASH))
            return;
        
        Child.SetLastCache(BlockNum);
        
        var Arr = Engine.GetMaxArrForSend(Child, BlockNum, bNext);
        if(!Arr.length)
        {
            if(bNext)
            {
                JINN_STAT.MaxReqErr++;
            }
            return;
        }
        
        Engine.ProcessMaxHashOnSend(Child, BlockNum, Arr);
        
        if(bNext)
        {
        }
        
        if(!Child.FirstTransferTime)
            Child.FirstTransferTime = Date.now();
        Child.SendTransferTime = Date.now();
        
        for(var i = 0; i < Arr.length; i++)
        {
            var CountItem = Arr[i].CountItem;
            if(!CountItem)
                CountItem = 0;
            
            JINN_STAT.MaxReqAll += CountItem;
            if(i <= 3)
            {
                JINN_STAT["MaxReq" + i] += CountItem;
            }
        }
        
        JINN_STAT.MaxIteration = Math.max(JINN_STAT.MaxIteration, 1 + MAX_ITERATION_MAX_HASH - IterationNum);
        
        if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT - 1)
            return;
        
        let DeltaForSend = JINN_EXTERN.GetCurrentBlockNumByTime() - BlockNum;
        
        Engine.Send("MAXHASH", Child, {Cache:Child.CurrentCacheVersion, BlockNum:BlockNum, CodeVersionNum:CODE_VERSION.VersionNum,
            NetConstVer:JINN_NET_CONSTANT.NetConstVer, Arr:Arr, Debug:global.TEST_CONNECTOR}, function (Child,Data)
        {
            if(!Data)
                return;
            
            JINN_STAT.MaxLoadAll += Data.HeaderArr.length + Data.BodyArr.length;
            
            Child.TransferCount++;
            Child.DeltaTransfer = Date.now() - Child.SendTransferTime;
            
            Child.CheckCache(Data.Cache, BlockNum);
            var Store = Engine.GetLiderArrAtNum(BlockNum);
            if(!Store)
                return;
            
            var bWas = 0;
            var CountReceive = 0;
            for(var n = 0; n < Data.HeaderArr.length; n++)
            {
                var Value = Data.HeaderArr[n];
                if(Value)
                {
                    CountReceive++;
                    JINN_STAT.HeaderLoad++;
                    Engine.AddBlockHeader(Child, Value, Store);
                    JINN_STAT.MaxLoad++;
                    bWas = 1;
                }
            }
            
            for(var n = 0; n < Data.BodyArr.length; n++)
            {
                var Value = Data.BodyArr[n];
                if(Value)
                {
                    CountReceive++;
                    JINN_STAT.BodyLoad++;
                    Engine.AddBlockBody(Child, Value, Store);
                    JINN_STAT.MaxLoad++;
                    bWas = 1;
                }
            }
            
            Engine.DoMaxStatus(Store);
            
            if(bWas)
            {
                if(IterationNum <= 1)
                    return;
                
                if(Context.WasReturn && Context.WasReturn !== Child)
                {
                    if(global.TEST_CONNECTOR)
                        Child.ToLog("WAS RETURN BY ANOTHER CHILD Got:" + Context.WasCountReceive + " now got:" + CountReceive);
                    return;
                }
                
                Context.WasReturn = Child;
                Context.WasCountReceive = CountReceive;
                var BlockNum2 = JINN_EXTERN.GetCurrentBlockNumByTime() - DeltaForSend;
                
                Engine.SendMaxHashNextTime(BlockNum2, Child, Context, IterationNum - 1, 1);
            }
        });
    };
    
    Engine.MAXHASH_SEND = {Cache:"uint", BlockNum:"uint32", NetConstVer:"uint32", CodeVersionNum:"uint32", Arr:[{Mode:"byte", DataHashNum:"byte",
            DataHash:"zhash", MinerHash:"hash", CountItem:"uint16", LoadN:"uint", LoadH:"zhash"}], Debug:"byte", };
    Engine.MAXHASH_RET = {result:"byte", Cache:"uint", Mode:"byte", HeaderArr:[{BlockNum:"uint32", PrevSumPow:"uint", LinkSumHash:"hash",
            TreeHash:"zhash", MinerHash:"hash"}], BodyArr:[{BlockNum:"uint32", TxData:[{body:"tr"}], TxTransfer:[{Index:"uint16", body:"tr"}],
            TTTransfer:["arr" + JINN_CONST.TX_TICKET_HASH_LENGTH], TxReceive:["uint16"], TxSend:["uint16"]}]};
    Engine.MAXHASH = function (Child,Data)
    {
        var BlockNum = Data.BlockNum;
        if(!Engine.ProcessMaxHashOnReceive(Child, BlockNum, Data.Arr))
            return;
        
        Child.NetConstVer = Data.NetConstVer;
        Child.CodeVersionNum = Data.CodeVersionNum;
        if(Engine.StartGetNetConstant && Data.NetConstVer > JINN_NET_CONSTANT.NetConstVer)
        {
            Engine.StartGetNetConstant(Child, Data.NetConstVer);
        }
        
        if(Engine.StartGetNewVersion && (Data.CodeVersionNum > CODE_VERSION.VersionNum || Data.CodeVersionNum === CODE_VERSION.VersionNum && IsZeroArr(CODE_VERSION.Hash)))
        {
            Engine.StartGetNewVersion(Child, Data.CodeVersionNum);
        }
        
        if(Data.CodeVersionNum < global.MIN_JINN_VERSION_NUM)
            return {result:0};
        
        Engine.AddMaxHashToTimeStat(Child, Data);
        
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_MAXHASH))
            return {result:0};
        
        Child.LastTransferTime = Date.now();
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot() || Child.HotStart)
        {
            return {result:0};
        }
        if(Data.Arr.length > JINN_CONST.MAX_LEADER_COUNT)
            Data.Arr.length = JINN_CONST.MAX_LEADER_COUNT;
        
        Child.SetLastCache(BlockNum);
        
        var HeaderArr = [];
        var BodyArr = [];
        var RetMode = 0;
        
        var bWasCanntUpload = 0;
        for(var i = 0; i < Data.Arr.length; i++)
        {
            var Status = Data.Arr[i];
            Engine.AddHashToMaxLider(Status, Data.BlockNum, 0);
            
            if(!Status.Mode || !Status.LoadN)
                continue;
            
            if(RetMode)
                continue;
            if(bWasCanntUpload || !Engine.CanUploadData(BlockNum, Status.LoadN))
            {
                if(!bWasCanntUpload)
                    ToLog("Cannt upload data to " + ChildName(Child), 4);
                bWasCanntUpload = 1;
                continue;
            }
            
            if(i > 0 && Data.BlockNum - Status.LoadN > JINN_CONST.MAX_DEPTH_FOR_SECONDARY_CHAIN)
                continue;
            
            if(Status.Mode === 1)
            {
                HeaderArr = Engine.GetHeaderArrForChild(Data.BlockNum, Status, Child);
                
                if(Data.Debug)
                {
                    JINN_STAT.WantHeader += Status.CountItem;
                    JINN_STAT.UploadHeader += HeaderArr.length;
                }
                if(HeaderArr.length)
                {
                    RetMode = 1;
                }
            }
            else
                if(Status.Mode === 2)
                {
                    BodyArr = Engine.GetBodyArrForChild(Data.BlockNum, Status, Child);
                    if(BodyArr.length)
                        RetMode = 2;
                }
        }
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime() - JINN_CONST.STEP_MAXHASH;
        if(BlockNum !== CurBlockNum)
        {
        }
        
        return {result:1, Cache:Child.CurrentCacheVersion, Mode:RetMode, HeaderArr:HeaderArr, BodyArr:BodyArr};
    };
    
    Engine.SendMaxHashNextTime = function (BlockNum,Child,Context,IterationNum,bNext)
    {
        setTimeout(function ()
        {
            Engine.SendMaxHashToOneNode(BlockNum, Child, Context, IterationNum, bNext);
        }, global.MAXHASH_TIMING);
    };
    Engine.StartSendLiderArrNextTime = function (BlockNum)
    {
        setTimeout(function ()
        {
            Engine.StartSendLiderArr(BlockNum);
        }, global.MAXHASH_TIMING);
    };
    
    Engine.CanUploadData = function (CurBlockNum,LoadBlockNum)
    {
        return 1;
    };
    
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
            if(!BlockHeader || BlockHeader.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT - 1)
                break;
            LoadNum = BlockHeader.BlockNum - 1;
            LoadHash = BlockHeader.PrevSumHash;
            var StrHash = GetHexFromArr(BlockHeader.Hash);
            if(glUseBHCache && CacheHeaderMap[StrHash])
                continue;
            CacheHeaderMap[StrHash] = 1;
            
            ArrRet.push(BlockHeader);
            Size += BlockHeader.Size;
            if(Size >= JINN_CONST.MAX_PACKET_SIZE_RET_DATA)
            {
                break;
            }
            
            if(global.MAX_SHA3_VALUE && global.glKeccakCount > global.MAX_SHA3_VALUE)
            {
                var Delta = Math.abs(Status.LoadN - BlockNum);
                if(Delta > 8)
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
        var BlockBody = Engine.GetBodyByHash(Status.LoadN, Status.LoadH);
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
                if(SizeRet >= JINN_CONST.MAX_PACKET_SIZE_RET_DATA)
                {
                    break;
                }
                
                if(global.MAX_SHA3_VALUE && global.glKeccakCount > global.MAX_SHA3_VALUE)
                {
                    var Delta = Math.abs(Status.LoadN - BlockNum);
                    if(Delta > 8)
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
        
        if(global.TEST_CONSENSUS_BOOST)
        {
            Engine.CheckHashExistArr(BlockBody.TxData);
            var TreeHashTest = Engine.CalcTreeHash(BlockBody.BlockNum, BlockBody.TxData);
            if(!IsEqArr(TreeHashTest, BlockBody.TreeHash))
            {
                Engine.ToLog("Error send block = " + BlockBody.BlockNum + " on AddBodyBlockToArr: TreeHash=" + TreeHashTest + "/" + BlockBody.TreeHash);
                return Size;
            }
        }
        
        var Item = {BlockNum:BlockBody.BlockNum, TxData:BlockBody.TxData};
        
        Arr.push(Item);
        Size += BlockBody.Size;
        
        JINN_STAT.BodyTxSend += Engine.ProcessBlockOnSend(Child, Item);
        
        return Size;
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
