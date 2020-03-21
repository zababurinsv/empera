/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * The algorithm of the consensus network (the maximal chain of blocks for the amount of PoW)
 *
 */


'use strict';

global.JINN_MODULES.push({InitClass:InitClass, Name:"Consensus"});

//Engine context

function InitClass(Engine)
{
    Engine.MaxLiderList = {};
    
    Engine.Header1 = 0;
    Engine.Header2 = 0;
    Engine.Block1 = 0;
    Engine.Block2 = 0;
    
    Engine.DoSaveMaxLider = function (CurBlockNum)
    {
        var Store = Engine.GetLiderArrAtNum(CurBlockNum);
        if(Store)
        {
            Engine.DoMaxStatus(Store);
        }
    };
    
    Engine.GetBlockArrFromNum = function (BlockNum,bBody)
    {
        return Engine.DB.GetChainArrByNum(BlockNum, bBody);
    };
    
    Engine.GetHeaderForChild = function (LoadNum,LoadHash)
    {
        if(LoadNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            var Block = Engine.GetBlockHeaderDB(LoadNum);
            if(!Block)
            {
                ToLogTrace("Cannt GetHeaderForChild Block=" + LoadNum);
                return undefined;
            }
            return Engine.CalcBlockHeader(Block);
        }
        if(!LoadHash)
            return undefined;
        
        var Arr = Engine.GetBlockArrFromNum(LoadNum);
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(Block && Block.SumHash && IsEqArr(Block.SumHash, LoadHash))
                return Engine.CalcBlockHeader(Block);
            
            if(Block && Block.Hash && IsEqArr(Block.Hash, LoadHash))
                return Engine.CalcBlockHeader(Block);
        }
        
        return undefined;
    };
    
    Engine.GetBodyByHash = function (BlockNum,Hash)
    {
        if(IsZeroArr(Hash))
            return undefined;
        
        var RetBlock = undefined;
        var Arr = Engine.GetBlockArrFromNum(BlockNum, 1);
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(Block && (IsEqArr(Block.Hash, Hash) || IsEqArr(Block.SumHash, Hash) || IsEqArr(Block.TreeHash, Hash)))
            {
                if(IsZeroArr(Block.TreeHash))
                {
                    RetBlock = {PrevSumHash:Block.PrevSumHash, BlockNum:Block.BlockNum};
                }
                else
                {
                    if(NeedLoadBodyFromDB(Block))
                        Engine.DB.LoadBlockTx(Block);
                    
                    if(Block.TxData && Block.TxData.length)
                        return Engine.CalcBlockBody(Block);
                }
            }
        }
        return RetBlock;
    };
    
    Engine.PrepareBlockOnReceive = function (Block)
    {
        if(Block.BlockNum >= JINN_CONST.LINK_HASH_PREV_HASHSUM)
            Block.PrevSumHash = Block.LinkSumHash;
        
        Engine.CalcBlockData(Block);
    };
    
    Engine.AddBlockHeader = function (Child,Block,Store)
    {
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Engine.DoMaxStatus(Store);
            return ;
        }
        
        //block header arrived
        
        Engine.PrepareBlockOnReceive(Block);
        
        Child.ToDebug("Receive Header Block:" + Block.BlockNum);
        
        var bWasInLoad = 0;
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            if(IsEqArr(Block.SumHash, NodeStatus.LoadHash) || IsEqArr(Block.Hash, NodeStatus.LoadHash))
            {
                bWasInLoad = 1;
                break;
            }
        }
        
        if(!bWasInLoad)
            return 0;
        
        //search in the array of loaded blocks
        var WasInChain = 0;
        
        var Find = Engine.DB.GetBlockFromDB(Block.BlockNum, Block.SumHash);
        if(!Find)
            Engine.DB.WriteBlock(Block);
        
        if(!Find)
        {
            //making a new entry in the array
            
            Engine.DoMaxStatus(Store);
            Child.BlockProcessCount++;
            
            return 1;
        }
        
        return 0;
    };
    
    Engine.AddBlockBody = function (Child,Block,Store)
    {
        if(Engine.ProcessBlockOnReceive)
        {
            if(!Engine.ProcessBlockOnReceive(Child, Block))
                return ;
        }
        
        Child.ToDebug("Receive Body Block:" + Block.BlockNum);
        
        //we calculate the sent data hash
        
        Engine.SortBlock(Block);
        
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        
        //making an entry in the array of loaded blocks
        
        var bSaveChain = Engine.DB.SetTxData(Block.BlockNum, Block.TreeHash, Block.TxData);
        if(bSaveChain)
        {
            Child.BlockProcessCount++;
            Engine.DoMaxStatus(Store);
        }
    };
    
    Engine.CanDoNextBodyLoad = function (BlockHead,NodeStatus,BlockSeed,Num)
    {
        var BodyForLoad = Engine.GetFirstEmptyBodyBlock(BlockHead.BlockNum, BlockSeed);
        if(BodyForLoad)
        {
            if(BodyForLoad.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
                ToLogTrace("Error BodyForLoad on " + BodyForLoad.BlockNum);
            Engine.ToDebug("AddBlockBody: BodyForLoad=" + BodyForLoad.BlockNum + " TreeHash=" + BodyForLoad.TreeHash);
            
            //continue loading the body
            NodeStatus.LoadTreeNum = BodyForLoad.BlockNum;
            NodeStatus.LoadTreeHash = BodyForLoad.TreeHash;
            NodeStatus.LoadBlockHead = BodyForLoad;
            
            Engine.SetStatusInfoB(NodeStatus, Num);
            
            return 1;
        }
        else
        {
            NodeStatus.LoadTreeNum = 0;
            NodeStatus.LoadTreeHash = [];
            NodeStatus.LoadBlockHead = undefined;
            return 0;
        }
    };
    
    Engine.SetStatusInfoH = function (NodeStatus,Num)
    {
        if(Num !== 0)
            return ;
        Engine.Header1 = NodeStatus.LoadNum;
        if(NodeStatus.BlockSeed)
            Engine.Header2 = NodeStatus.BlockSeed.BlockNum;
        else
            Engine.Header2 = NodeStatus.LoadNum;
    };
    Engine.SetStatusInfoB = function (NodeStatus,Num)
    {
        if(Num !== 0)
            return ;
        
        if(NodeStatus.LoadBlockHead)
            Engine.Block1 = NodeStatus.LoadBlockHead.BlockNum;
        else
            Engine.Block1 = NodeStatus.BlockSeed.BlockNum;
        Engine.Block2 = NodeStatus.BlockSeed.BlockNum;
    };
    
    Engine.GetLiderArrAtNum = function (BlockNum)
    {
        var Store = Engine.MaxLiderList[BlockNum];
        if(!Store)
        {
            Store = {BlockNum:BlockNum, LiderArr:[]};
            Engine.MaxLiderList[BlockNum] = Store;
        }
        return Store;
    };
    
    Engine.FillDataMaxLider = function (Data,BlockNum)
    {
        if(Data.DataHash === undefined)
            ToLogTrace("PrecessDataMaxLider Error DataHash on block:" + BlockNum);
        
        if(Data.MinerHash === undefined)
            ToLogTrace("PrecessDataMaxLider Error MinerHash on block:" + BlockNum);
    };
    
    Engine.CalcHashMaxLider = function (Data,BlockNum)
    {
        
        if(!Data.DataHash || IsZeroArr(Data.DataHash))
            ToLogTrace("ZERO DataHash on block:" + BlockNum);
        Data.Hash = sha3(Data.DataHash.concat(Data.MinerHash));
        Data.Power = GetPowPower(Data.Hash);
    };
    
    Engine.CompareMaxLider = function (Data1,Data2)
    {
        if(Data1.Power < Data2.Power || (Data1.Power === Data2.Power && CompareArr(Data2.Hash, Data1.Hash) <= 0))
        {
            return  - 1;
        }
        else
        {
            return 1;
        }
    };
    
    Engine.AddHashToMaxLider = function (Data,BlockNum,bFromCreateNew)
    {
        if(!CanProcessBlock(Engine, BlockNum, JINN_CONST.STEP_MAXHASH))
            return  - 1;
        
        Engine.CalcHashMaxLider(Data, BlockNum);
        Engine.FillDataMaxLider(Data, BlockNum);
        
        var Store = Engine.GetLiderArrAtNum(BlockNum);
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
            var NodeStatus2 = {Power:Data.Power, Hash:Data.Hash, PrevSumHash:Data.PrevSumHash, SumHash:Data.SumHash, LinkSumHash:Data.LinkSumHash,
                TreeHash:Data.TreeHash, DataHash:Data.DataHash, MinerHash:Data.MinerHash, BlockSeed:undefined, LoadNum:0, LoadHash:[], LoadTreeNum:0,
                LoadTreeHash:[], };
            LiderArr.splice(Ret, 0, NodeStatus2);
            if(LiderArr.length > JINN_CONST.MAX_LEADER_COUNT)
                LiderArr.length = JINN_CONST.MAX_LEADER_COUNT;
        }
        
        if(!bFromCreateNew)
            Engine.DoMaxStatus(Store);
        
        return Ret;
    };
    
    Engine.DoMaxStatus = function (Store)
    {
        var BlockNum = Store.BlockNum;
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            if(!NodeStatus.BlockSeed)
            {
                NodeStatus.BlockSeed = Engine.DB.GetBlockFromDB(BlockNum, NodeStatus.Hash);
            }
            
            var BlockSeed = NodeStatus.BlockSeed;
            if(!BlockSeed)
            {
                NodeStatus.LoadNum = BlockNum;
                NodeStatus.LoadHash = NodeStatus.Hash;
                Engine.SetStatusInfoH(NodeStatus, n);
                continue;
            }
            
            var BlockHead = Engine.CalcHead(BlockSeed);
            
            //checking for database entries
            if(!Engine.IsValidBlockDB(BlockHead))
            {
                if(BlockHead.BlockNum >= JINN_CONST.BLOCK_GENESIS_COUNT)
                {
                    
                    if(BlockHead.BlockNum === JINN_CONST.BLOCK_GENESIS_COUNT)
                    {
                        
                        var Block2 = Engine.GetBlockHeaderDB(BlockHead.BlockNum - 1);
                        if(!IsEqArr(BlockHead.PrevSumHash, Block2.SumHash))
                        {
                            ToLogTrace("Error BlockHead at BlockNum = " + BlockHead.BlockNum);
                            
                            var BlockHead2 = Engine.CalcHead(BlockSeed);
                            var PrevBlock2 = Engine.GetPrevBlock(BlockHead2);
                        }
                    }
                    NodeStatus.LoadNum = BlockHead.BlockNum - 1;
                    NodeStatus.LoadHash = BlockHead.PrevSumHash;
                    NodeStatus.LoadBlockHead = BlockHead;
                    Engine.SetStatusInfoH(NodeStatus, n);
                }
            }
            else
            {
                if(n === 0)
                {
                    Engine.Header1 = BlockSeed.BlockNum;
                    Engine.Header2 = Engine.Header1;
                }
                NodeStatus.LoadNum = 0;
                NodeStatus.LoadHash = [];
                NodeStatus.LoadBlockHead = undefined;
                if(Engine.CanDoNextBodyLoad(BlockHead, NodeStatus, BlockSeed, n))
                    continue;
                Engine.CheckAndSaveChainToDB(BlockHead, BlockSeed);
                
                if(n === 0)
                {
                    Engine.Block1 = BlockSeed.BlockNum;
                    Engine.Block2 = Engine.Block1;
                }
            }
        }
    };
    
    Engine.CheckAndSaveChainToDB = function (BlockHead,BlockSeed)
    {
        
        //Calc SumPow
        var BlockDB = Engine.GetBlockHeaderDB(BlockHead.BlockNum);
        if(!BlockDB)
            return 0;
        
        var CurBlockSeed = BlockSeed;
        for(var delta = 0; delta <= JINN_CONST.STEP_LAST; delta++)
        {
            if(CurBlockSeed.BlockNum < BlockHead.BlockNum)
                break;
            
            var BlockSeedDB = Engine.GetBlockHeaderDB(CurBlockSeed.BlockNum);
            if(BlockSeedDB)
            {
                
                if(delta === 0 && IsEqArr(BlockSeedDB.SumHash, CurBlockSeed.SumHash))
                {
                    //so there is a record of this chain in the database and since it is more priority, we stop the cycle
                    return 0;
                }
                
                //write only if the chain has a large POW amount than the existing one in the database
                if(CurBlockSeed.SumPow < BlockSeedDB.SumPow || (CurBlockSeed.SumPow === BlockSeedDB.SumPow && CompareArr(BlockSeedDB.Hash,
                CurBlockSeed.Hash) <= 0))
                {
                    return 0;
                }
                
                break;
            }
            else
            {
                var PrevBlockSeed = Engine.GetPrevBlock(CurBlockSeed);
                if(!PrevBlockSeed)
                {
                    ToLogTrace("Error GetPrevBlock at block=" + CurBlockSeed.BlockNum);
                    break;
                }
                CurBlockSeed = PrevBlockSeed;
            }
        }
        
        //writing a chain to the database
        
        var Res = Engine.DB.SaveChainToDB(BlockHead, BlockSeed);
        if(Res ===  - 1)
        {
            Engine.ToLog("Error on SaveChainToDB " + BlockHead.BlockNum + "-" + BlockSeed.BlockNum + " POW:" + BlockSeed.SumPow);
        }
        
        return Res;
    };
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
