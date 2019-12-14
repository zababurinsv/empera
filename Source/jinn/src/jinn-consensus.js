/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass});
function InitClass(Engine)
{
    Engine.BlockStore = {};
    Engine.LoadingArr = {};
    Engine.StartSendLiderArr = function (BlockNum)
    {
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_MAXHASH))
            return ;
        var Store = Engine.GetStoreAtNum(BlockNum);
        var Arr = [];
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            var Element = {DataHash:NodeStatus.DataHash, MinerHash:NodeStatus.MinerHash, LoadNum:NodeStatus.LoadNum, LoadHash:NodeStatus.LoadHash,
                LoadTreeNum:NodeStatus.LoadTreeNum, LoadTreeHash:NodeStatus.LoadTreeHash};
            Arr.push(Element);
        }
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child && Child.Active && Child.Hot)
            {
                if(!Child.SendTransferLider)
                    Child.SendTransferLider = Date.now();
                Child.SetLastCache(BlockNum);
                Engine.Send("MAXHASH", Child, {Cache:Child.CurrentCache, BlockNum:BlockNum, Arr:Arr}, function (Child,Data)
                {
                    if(!Data)
                        return ;
                    if(Data.Header)
                    {
                        Engine.AddBlockHeader(Child, Data.Header, Store);
                    }
                    if(Data.Body)
                    {
                        Engine.AddBlockBody(Child, Data.Body, Store);
                    }
                    if(Data.Header || Data.Body)
                    {
                        Engine.DoEventDB(Store);
                    }
                });
            }
        }
    };
    Engine.MAXHASH = function (Child,Data)
    {
        var BlockNum = Data.BlockNum;
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_MAXHASH))
            return ;
        Child.LastTransferLider = Date.now();
        Engine.CheckHotConnection(Child);
        if(!Child || Child.Disconnect || !Child.Hot || Child.HotStart)
            return ;
        Child.CheckCache(Data.Cache, BlockNum);
        var Count = 0;
        var RetHeader, RetBody;
        for(var i = 0; i < Data.Arr.length; i++)
        {
            var Status = Data.Arr[i];
            var ResultNum = Engine.AddHashToMaxLider(Status, Data.BlockNum, 0);
            if(ResultNum >= 0)
            {
                Count++;
            }
            if(!RetHeader)
            {
                RetHeader = Engine.GetHeaderForChild(Status);
            }
            if(!RetBody)
            {
                RetBody = Engine.GetBodyForChild(Status);
                if(RetBody)
                    JINN_STAT.BodyTxSend += Engine.ProcessBlockOnSend(Child, RetBody);
            }
        }
        return {result:1, Cache:Child.CurrentCache, Header:RetHeader, Body:RetBody};
    };
    Engine.GetBlockArrFromNum = function (BlockNum)
    {
        var Arr = [];
        if(BlockNum)
        {
            var ArrBlock = Engine.LoadingArr[BlockNum];
            var Len;
            if(ArrBlock)
                Len = ArrBlock.length;
            else
                Len = 0;
            for(var n =  - 1; n < Len; n++)
            {
                var Block;
                if(n ===  - 1)
                {
                    Block = Engine.GetBlockDB(BlockNum);
                }
                else
                {
                    Block = ArrBlock[n];
                }
                Arr.push(Block);
            }
        }
        return Arr;
    };
    Engine.GetHeaderForChild = function (Status)
    {
        var Arr = Engine.GetBlockArrFromNum(Status.LoadNum);
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(Block && IsEqArr(Block.Hash, Status.LoadHash))
            {
                return Engine.GetBlockHeader(Block);
            }
        }
        return undefined;
    };
    Engine.GetBodyForChild = function (Status)
    {
        var Arr = Engine.GetBlockArrFromNum(Status.LoadTreeNum);
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(Block && IsEqArr(Block.TreeHash, Status.LoadTreeHash) && Block.TxData)
            {
                var Data = Engine.GetBlockBody(Block);
                return Data;
            }
        }
        return undefined;
    };
    Engine.GetLoadingArrayByNum = function (BlockNum)
    {
        var ArrBlock = Engine.LoadingArr[BlockNum];
        if(!ArrBlock)
        {
            ArrBlock = [];
            Engine.LoadingArr[BlockNum] = ArrBlock;
        }
        return ArrBlock;
    };
    Engine.AddBlockHeader = function (Child,Block,Store)
    {
        if(IsZeroArr(Block.TreeHash))
            Block.TxData = [];
        Engine.CalcBlockHash(Block);
        Child.ToDebug("Receive Header Block:" + Block.BlockNum);
        var ArrBlock = Engine.GetLoadingArrayByNum(Block.BlockNum);
        var WasBlock = 0;
        for(var i = 0; i < ArrBlock.length; i++)
        {
            var CurBlock = ArrBlock[i];
            if(IsEqArr(CurBlock.Hash, Block.Hash))
            {
                WasBlock = 1;
                Block = CurBlock;
                Child.ToDebug("WasBlock " + Block.BlockNum);
            }
            if(!Block.TxData && CurBlock.TreeHash && IsEqArr(CurBlock.TreeHash, Block.TreeHash))
            {
                Block.TxData = CurBlock.TxData;
                Child.ToDebug("Find TxData in channel " + i + " on Block=" + CurBlock.BlockNum);
            }
        }
        if(!WasBlock)
        {
            ArrBlock.push(Block);
        }
        var ArrBlock1 = Engine.LoadingArr[Block.BlockNum - 1];
        if(ArrBlock1)
        {
            for(var i = 0; i < ArrBlock1.length; i++)
            {
                var Block1 = ArrBlock1[i];
                if(IsEqArr(Block1.Hash, Block.PrevHash) && Block.PrevBlock !== Block1)
                {
                    Block.PrevBlock = Block1;
                    Child.ToDebug("Cur prev link: " + Block1.BlockNum + "<-" + Block.BlockNum);
                    break;
                }
            }
        }
        var ArrBlock2 = Engine.LoadingArr[Block.BlockNum + 1];
        if(ArrBlock2)
        {
            for(var i = 0; i < ArrBlock2.length; i++)
            {
                var Block2 = ArrBlock2[i];
                if(IsEqArr(Block2.PrevHash, Block.Hash) && Block2.PrevBlock !== Block)
                {
                    Block2.PrevBlock = Block;
                    Child.ToDebug("Next prev link: " + Block.BlockNum + "<-" + Block2.BlockNum);
                }
            }
        }
        var bWas = 0;
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            if(NodeStatus.LoadNum === Block.BlockNum && IsEqArr(NodeStatus.LoadHash, Block.Hash))
            {
                Child.ToDebug("Header status:" + n + " processing:" + NodeStatus.LoadNum);
                if(!NodeStatus.BlockSeed)
                {
                    NodeStatus.BlockSeed = Block;
                    Child.ToDebug("Set NodeStatus.BlockSeed");
                }
                else
                {
                    if(NodeStatus.BlockSeed.BlockNum < Block.BlockNum)
                        ToLog("Err BlockSeed.BlockNum=" + NodeStatus.BlockSeed.BlockNum + "   Block.BlockNum=" + Block.BlockNum);
                }
                var HeadBlock = Engine.GetFirstHeadBlock(NodeStatus.BlockSeed);
                if(HeadBlock)
                    Child.ToDebug("AddBlockHeader: HeadBlock=" + HeadBlock.BlockNum + " Hash=" + HeadBlock.Hash + " PrevHash=" + HeadBlock.PrevHash);
                NodeStatus.LoadNum = HeadBlock.BlockNum - 1;
                NodeStatus.LoadHash = HeadBlock.PrevHash;
                NodeStatus.LoadHead = HeadBlock;
                if(!bWas)
                {
                    Engine.Header1 = NodeStatus.LoadNum;
                    Engine.Header2 = NodeStatus.BlockSeed.BlockNum;
                }
                bWas = 1;
                if(global.JINN_WARNING >= 5)
                {
                    var ArrBlock2 = Engine.LoadingArr[NodeStatus.LoadNum];
                    for(var i = 0; NodeStatus.LoadNum && ArrBlock2 && i < ArrBlock2.length; i++)
                    {
                        var CurBlock = ArrBlock2[i];
                        if(IsEqArr(CurBlock.Hash, NodeStatus.LoadHash))
                        {
                            Engine.ToLog("<-" + Child.ID + ". Error WAS loaded Block: " + CurBlock.BlockNum + " WAS CahcheVersion=" + Child.CahcheVersion);
                        }
                    }
                }
                var BlockDB = Engine.GetBlockHeaderDB(HeadBlock.BlockNum);
                if(BlockDB)
                    Child.ToDebug("BlockDB=" + BlockDB.BlockNum + " Hash=" + BlockDB.Hash);
                if(BlockDB && IsEqArr(BlockDB.Hash, HeadBlock.Hash))
                {
                    NodeStatus.LoadNum = 0;
                    NodeStatus.LoadHash = [];
                    NodeStatus.LoadHead = undefined;
                    FillSumPow(BlockDB, NodeStatus.BlockSeed);
                }
            }
        }
        return bWas;
    };
    Engine.AddBlockBody = function (Child,Block,Store)
    {
        if(Engine.ProcessBlockOnReceive)
        {
            if(!Engine.ProcessBlockOnReceive(Child, Block))
                return ;
        }
        Child.ToDebug("Receive Body Block:" + Block.BlockNum);
        var ArrBlock = Engine.LoadingArr[Block.BlockNum];
        if(!ArrBlock)
        {
            return ;
        }
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        var bWas = 0;
        for(var i = 0; i < ArrBlock.length; i++)
        {
            var CurBlock = ArrBlock[i];
            if(!CurBlock.TxData && IsEqArr(CurBlock.TreeHash, Block.TreeHash))
            {
                if(!bWas)
                    Engine.ToDebug("Get body " + Block.BlockNum);
                bWas = 1;
                CurBlock.TxData = Block.TxData;
            }
        }
        if(!bWas)
            return ;
        var bWasInfo = 0;
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            if(!NodeStatus.BlockSeed)
                continue;
            if(NodeStatus.LoadTreeNum === Block.BlockNum && IsEqArr(NodeStatus.LoadTreeHash, Block.TreeHash))
            {
                Engine.ToDebug("Body processing:" + NodeStatus.LoadTreeNum);
                var BodyForLoad = Engine.GetFirstEmptyBodyBlock(NodeStatus.BlockSeed);
                if(BodyForLoad)
                {
                    Engine.ToDebug("AddBlockBody: BodyForLoad=" + BodyForLoad.BlockNum + " TreeHash=" + BodyForLoad.TreeHash);
                    NodeStatus.LoadTreeNum = BodyForLoad.BlockNum;
                    NodeStatus.LoadTreeHash = BodyForLoad.TreeHash;
                    NodeStatus.LoadHead = BodyForLoad;
                    if(!bWasInfo)
                    {
                        Engine.Block1 = BodyForLoad.BlockNum;
                        Engine.Block2 = NodeStatus.BlockSeed.BlockNum;
                    }
                    bWasInfo = 1;
                }
                else
                {
                    NodeStatus.LoadTreeNum = 0;
                    NodeStatus.LoadTreeHash = [];
                    NodeStatus.LoadHead = undefined;
                }
            }
        }
    };
    Engine.DoEventDB = function (Store)
    {
        Engine.ToDebug("Engine.DoEventDB");
        var bWasInfo = 0;
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            var BlockSeed = NodeStatus.BlockSeed;
            if(!BlockSeed || NodeStatus.LoadNum || NodeStatus.LoadTreeNum)
                continue;
            var BodyForLoad = Engine.GetFirstEmptyBodyBlock(BlockSeed);
            if(BodyForLoad)
            {
                Engine.ToDebug("Was find body for load " + BodyForLoad.BlockNum);
                NodeStatus.LoadTreeNum = BodyForLoad.BlockNum;
                NodeStatus.LoadTreeHash = BodyForLoad.TreeHash;
                NodeStatus.LoadHead = BodyForLoad;
                if(!bWasInfo)
                {
                    Engine.Block1 = BodyForLoad.BlockNum;
                    Engine.Block2 = BlockSeed.BlockNum;
                }
                continue;
            }
            var LastBlockDB = Engine.GetBlockHeaderDB(BlockSeed.BlockNum);
            if(LastBlockDB && IsEqArr(LastBlockDB.Hash, NodeStatus.Hash))
            {
                Engine.ToDebug("WAS SAVE TO DB LastBlockDB AT BLOCK: " + BlockSeed.BlockNum);
                break;
            }
            var HeadBlock = Engine.GetFirstHeadBlock(BlockSeed);
            var BlockDB = Engine.GetBlockHeaderDB(HeadBlock.BlockNum);
            if(!BlockDB)
                continue;
            if(!FillSumPow(BlockDB, BlockSeed))
                continue;
            if(!BlockSeed.SumPow)
                continue;
            if(LastBlockDB && BlockSeed.SumPow <= LastBlockDB.SumPow)
            {
                Engine.ToDebug("Error POW " + BlockSeed.SumPow + "/" + LastBlockDB.SumPow + "  BlockNum=" + BlockSeed.BlockNum);
                continue;
            }
            Engine.ToDebug("BlockDB=" + BlockDB.BlockNum + " Hash=" + BlockDB.Hash);
            if(BlockDB && IsEqArr(BlockDB.Hash, HeadBlock.Hash))
            {
                Engine.ToDebug("SaveChainToDB " + HeadBlock.BlockNum + "-" + BlockSeed.BlockNum + " POW:" + BlockSeed.SumPow);
                Engine.SaveChainToDB(BlockSeed, HeadBlock);
                break;
            }
        }
    };
    Engine.GetStoreAtNum = function (BlockNum)
    {
        var Store = Engine.BlockStore[BlockNum];
        if(!Store)
        {
            Store = {BlockNum:BlockNum, LiderArr:[]};
            Engine.BlockStore[BlockNum] = Store;
        }
        return Store;
    };
    Engine.FillDataMaxLider = function (Data,BlockNum,bBlock)
    {
        if(bBlock)
            Data.DataHash = Data.SeqHash;
        if(Data.DataHash === undefined)
            throw "PrecessDataMaxLider Error DataHash on block:" + BlockNum;
        if(bBlock)
            Data.MinerHash = Data.AddrHash;
        if(Data.MinerHash === undefined)
            throw "PrecessDataMaxLider Error MinerHash on block:" + BlockNum;
    };
    Engine.CalcHashMaxLider = function (Data,BlockNum,bBlock)
    {
        Data.BlockNum = BlockNum;
        Data.Hash = sha3(Data.DataHash.concat(Data.MinerHash));
        Data.POWER = Engine.GetPowPower(Data.Hash);
    };
    Engine.CompareMaxLider = function (Data1,Data2)
    {
        if(Data1.POWER < Data2.POWER || (Data1.POWER === Data2.POWER && CompareArr(Data2.Hash, Data1.Hash) <= 0))
        {
            return  - 1;
        }
        else
        {
            return 1;
        }
    };
    Engine.AddHashToMaxLider = function (Data,BlockNum,bBlock)
    {
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_MAXHASH))
            return  - 1;
        Engine.FillDataMaxLider(Data, BlockNum, bBlock);
        Engine.CalcHashMaxLider(Data, BlockNum, bBlock);
        var Store = Engine.GetStoreAtNum(BlockNum);
        var LiderArr = Store.LiderArr;
        var Ret =  - 1;
        for(var n = 0; n < LiderArr.length; n++)
        {
            var NodeStatus = LiderArr[n];
            if(IsEqArr(NodeStatus.Hash, Data.Hash))
                return  - 1;
            if(Engine.CompareMaxLider(NodeStatus, Data) < 0)
            {
                Ret = n;
                break;
            }
        }
        if(Ret ===  - 1 && LiderArr.length < JINN_CONST.MAX_LEADER_COUNT)
        {
            Ret = LiderArr.length;
        }
        if(Ret >= 0)
        {
            var NodeStatus2 = {POWER:Data.POWER, Hash:Data.Hash, DataHash:Data.DataHash, MinerHash:Data.MinerHash, BlockSeed:undefined,
                LoadNum:0, LoadHash:[], LoadTreeNum:0, LoadTreeHash:[]};
            if(bBlock)
            {
                NodeStatus2.LoadNum = 0;
                NodeStatus2.LoadHash = [];
            }
            else
            {
                NodeStatus2.LoadNum = BlockNum;
                NodeStatus2.LoadHash = NodeStatus2.Hash;
            }
            LiderArr.splice(Ret, 0, NodeStatus2);
            if(LiderArr.length > JINN_CONST.MAX_LEADER_COUNT)
                LiderArr.length = JINN_CONST.MAX_LEADER_COUNT;
        }
        return Ret;
    };
    Engine.GetFirstEmptyBodyBlock0 = function (SeedBlock)
    {
        var Block = SeedBlock;
        if(Block && !Block.TxData)
            return Block;
        while(Block && Block.PrevBlock)
        {
            if(Engine.IsValideDBSave(Block))
                break;
            Block = Block.PrevBlock;
            if(!Block.TxData)
            {
                return Block;
            }
        }
        return undefined;
    };
    Engine.GetFirstHeadBlock = function (SeedBlock)
    {
        var Block = SeedBlock;
        while(Block && Block.PrevBlock)
        {
            if(Engine.IsValideDBSave(Block))
                break;
            Block = Block.PrevBlock;
        }
        SeedBlock.FirstHeadBlock = Block;
        return Block;
    };
    Engine.GetFirstEmptyBodyBlock = function (SeedBlock)
    {
        var BodyForLoad = Engine.GetFirstEmptyBodyBlock0(SeedBlock);
        if(!BodyForLoad)
            return BodyForLoad;
        var ArrBlock = Engine.GetBlockArrFromNum(BodyForLoad.BlockNum);
        if(ArrBlock)
        {
            for(var i = 0; i < ArrBlock.length; i++)
            {
                var Block = ArrBlock[i];
                if(Block && Block.TxData && IsEqArr(Block.TreeHash, BodyForLoad.TreeHash))
                {
                    BodyForLoad.TxData = Block.TxData;
                    return Engine.GetFirstEmptyBodyBlock(BodyForLoad);
                }
            }
        }
        return BodyForLoad;
    };
}
function FillSumPow(BlockDB,BlockSeed)
{
    if(!BlockDB)
        throw "FillSumPow Error BlockDB";
    if(!BlockSeed)
        throw "FillSumPow Error BlockSeed";
    var TotalSum = 0;
    var Block = BlockSeed;
    var StopBlock = undefined;
    while(Block)
    {
        if(IsEqArr(BlockDB.Hash, Block.Hash))
        {
            StopBlock = Block;
            StopBlock.SumPow = BlockDB.SumPow;
            TotalSum += StopBlock.SumPow;
            break;
        }
        TotalSum += Block.Power;
        Block = Block.PrevBlock;
        if(!Block)
            return 0;
    }
    Block = BlockSeed;
    while(Block)
    {
        if(Block === StopBlock)
            break;
        Block.SumPow = TotalSum;
        TotalSum -= Block.Power;
        Block = Block.PrevBlock;
    }
    if(TotalSum !== StopBlock.SumPow)
        throw "Error fill FillSumPow";
    return 1;
}
function CanProcessBlock(Engine,BlockNum,Step)
{
    var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime() - Step;
    var Delta = CurBlockNum - BlockNum;
    if(Math.abs(Delta) <= JINN_CONST.MAX_DELTA_PROCESSING)
        return 1;
    return 0;
}
global.CanProcessBlock = CanProcessBlock;
