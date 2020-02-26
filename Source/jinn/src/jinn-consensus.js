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

global.JINN_MODULES.push({InitClass:InitClass});

//Engine context

function InitClass(Engine)
{
    Engine.BlockStore = {};
    
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
            if(Child && Child.IsOpen() && Child.IsHot())
            {
                if(!Child.FirstTransferTime)
                    Child.FirstTransferTime = Date.now();
                Child.SendTransferTime = Date.now();
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
        
        Child.LastTransferTime = Date.now();
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot() || Child.HotStart)
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
                RetHeader = Engine.GetHeaderForChild(Status.LoadNum, Status.LoadHash);
            }
            if(!RetBody)
            {
                RetBody = Engine.GetBodyForChild(Status.LoadTreeNum, Status.LoadTreeHash);
                if(RetBody)
                    JINN_STAT.BodyTxSend += Engine.ProcessBlockOnSend(Child, RetBody);
            }
        }
        
        return {result:1, Cache:Child.CurrentCache, Header:RetHeader, Body:RetBody};
    };
    
    Engine.GetBlockArrFromNum = function (BlockNum,bBody)
    {
        var Arr = [];
        if(BlockNum)
        {
            
            var ArrBlock = Engine.GetChainArrByNum(BlockNum, 1);
            
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
                    if(bBody)
                        Block = Engine.GetBlockDB(BlockNum);
                    else
                        Block = Engine.GetBlockHeaderDB(BlockNum);
                    
                    if(!Block)
                    {
                        continue;
                    }
                    if(bBody && !IsZeroArr(Block.TreeHash) && (!Block.TxData || Block.TxData.length === 0))
                        ToLogTrace("1 GetBlockArrFromNum : Error block tx data TreeHash=" + Block.TreeHash + " on block: " + Block.BlockNum + " bBody=" + bBody);
                }
                else
                {
                    Block = ArrBlock[n];
                    
                    if(!IsZeroArr(Block.TreeHash) && (Block.TxData && Block.TxData.length === 0))
                        ToLogTrace("2 GetBlockArrFromNum : Error block tx data TreeHash=" + Block.TreeHash + " on block: " + Block.BlockNum);
                }
                Arr.push(Block);
            }
        }
        return Arr;
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
            return Engine.GetBlockHeader(Block);
        }
        if(!LoadHash)
            return undefined;
        
        var Arr = Engine.GetBlockArrFromNum(LoadNum);
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(Block && !Block.Hash)
                throw "!Block.Hash";
            
            if(Block && Block.Hash && IsEqArr(Block.Hash, LoadHash))
            {
                return Engine.GetBlockHeader(Block);
            }
        }
        
        return undefined;
    };
    
    Engine.GetBodyForChild = function (TreeNum,TreeHash)
    {
        if(IsZeroArr(TreeHash))
            return undefined;
        
        var Arr = Engine.GetBlockArrFromNum(TreeNum, 1);
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(Block && IsEqArr(Block.TreeHash, TreeHash) && Block.TxData)
            {
                var Data = Engine.GetBlockBody(Block);
                
                return Data;
            }
        }
        return undefined;
    };
    
    Engine.AddBlockHeader = function (Child,Block,Store)
    {
        //block header arrived
        
        if(IsZeroArr(Block.TreeHash))
            Block.TxData = [];
        
        Engine.CalcBlockHash(Block);
        Child.ToDebug("Receive Header Block:" + Block.BlockNum);
        
        //search in the array of loaded blocks
        var ArrBlock = Engine.GetChainArrByNum(Block.BlockNum);
        var WasBlock = 0;
        for(var i = 0; i < ArrBlock.length; i++)
        {
            var CurBlock = ArrBlock[i];
            if(!CurBlock || !CurBlock.Hash)
                throw "!CurBlock.Hash";
            
            //first check for duplicate blocks
            if(IsEqArr(CurBlock.Hash, Block.Hash))
            {
                WasBlock = 1;
                Block = CurBlock;
                Child.ToDebug("WasBlock " + Block.BlockNum);
            }
            
            //can there already be such a block body
            if(Block !== CurBlock && !Block.TxData && CurBlock.TxData && CurBlock.TreeHash && IsEqArr(CurBlock.TreeHash, Block.TreeHash))
            {
                
                Engine.SetBlockData(Block, CurBlock);
            }
        }
        
        if(!WasBlock)
        {
            //making a new entry in the array
            
            Engine.AddBlockToChain(Block);
        }
        
        //check the condition for further loading
        
        //iterating through the array of statuses-looking for a chain in which we will load blocks
        
        var bWasInfo = 0;
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            if(NodeStatus.LoadNum && NodeStatus.LoadNum === Block.BlockNum && IsEqArr(NodeStatus.LoadHash, Block.Hash))
            {
                Child.ToDebug("Header status:" + n + " processing:" + NodeStatus.LoadNum);
                
                if(!NodeStatus.BlockSeed)
                {
                    NodeStatus.BlockSeed = Block;
                }
                else
                {
                    if(NodeStatus.BlockSeed.BlockNum < Block.BlockNum)
                        ToLog("Err BlockSeed.BlockNum=" + NodeStatus.BlockSeed.BlockNum + "   Block.BlockNum=" + Block.BlockNum);
                }
                
                //Iterate over the loaded blocks starting from the status table, looking for the first one in the chain
                var BlockHead2 = Engine.CalcHead(NodeStatus.BlockSeed);
                if(!NodeStatus.BlockSeed.HeadNum)
                    continue;
                var BlockHead = Engine.GetNextPrevBlock(BlockHead2);
                
                //continue downloading
                if(BlockHead.BlockNum >= 1)
                {
                    NodeStatus.LoadNum = BlockHead.BlockNum - 1;
                    NodeStatus.LoadHash = BlockHead.PrevBlockHash;
                    NodeStatus.LoadHead = BlockHead;
                }
                else
                {
                    NodeStatus.LoadNum = 0;
                    NodeStatus.LoadHash = [];
                    NodeStatus.LoadHead = undefined;
                }
                
                if(!bWasInfo)
                {
                    Engine.Header1 = NodeStatus.LoadNum;
                    Engine.Header2 = NodeStatus.BlockSeed.BlockNum;
                    bWasInfo = 1;
                }
                
                //checking for database entries
                if(Engine.CheckCorrectLoad(BlockHead, BlockHead2, NodeStatus))
                {
                    NodeStatus.LoadNum = 0;
                    NodeStatus.LoadHash = [];
                    NodeStatus.LoadHead = undefined;
                    Child.BlockProcessCount++;
                }
            }
        }
    };
    
    Engine.AddBlockBody = function (Child,Block,Store)
    {
        if(Engine.ProcessBlockOnReceive)
        {
            
            if(!Engine.ProcessBlockOnReceive(Child, Block))
                return ;
        }
        
        Child.ToDebug("Receive Body Block:" + Block.BlockNum);
        
        //making an entry in the array of loaded blocks
        
        var ArrBlock = Engine.GetChainArrByNum(Block.BlockNum);
        if(!ArrBlock || ArrBlock.length === 0)
        {
            return ;
        }
        
        //we calculate the sent data hash
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        
        var bSaveChain = 0;
        for(var i = 0; i < ArrBlock.length; i++)
        {
            var CurBlock = ArrBlock[i];
            if(!CurBlock.TxData && IsEqArr(CurBlock.TreeHash, Block.TreeHash))
            {
                if(!bSaveChain)
                    Engine.ToDebug("Get body " + Block.BlockNum);
                bSaveChain = 1;
                
                Engine.SetBlockData(CurBlock, Block);
            }
        }
        
        if(!bSaveChain)
            return ;
        
        //iterating through the array of statuses-looking for a chain in which we will load blocks
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            if(!NodeStatus.BlockSeed)
                continue;
            
            if(NodeStatus.LoadTreeNum === Block.BlockNum && IsEqArr(NodeStatus.LoadTreeHash, Block.TreeHash))
            {
                Engine.ToDebug("Body processing:" + NodeStatus.LoadTreeNum);
                
                var BlockHead2 = Engine.CalcHead(NodeStatus.BlockSeed);
                var BlockHead = Engine.GetNextPrevBlock(BlockHead2);
                
                if(Engine.DoNextBodyLoad(BlockHead, NodeStatus))
                    Child.BlockProcessCount++;
            }
        }
    };
    
    Engine.DoNextBodyLoad = function (BlockHead,NodeStatus)
    {
        var BodyForLoad = Engine.GetFirstEmptyBodyBlock(BlockHead, NodeStatus.BlockSeed);
        if(BodyForLoad)
        {
            Engine.ToDebug("AddBlockBody: BodyForLoad=" + BodyForLoad.BlockNum + " TreeHash=" + BodyForLoad.TreeHash);
            
            //continue loading the body
            NodeStatus.LoadTreeNum = BodyForLoad.BlockNum;
            NodeStatus.LoadTreeHash = BodyForLoad.TreeHash;
            NodeStatus.LoadHead = BodyForLoad;
            
            Engine.Block1 = BodyForLoad.BlockNum;
            Engine.Block2 = NodeStatus.BlockSeed.BlockNum;
            
            return 1;
        }
        else
        {
            NodeStatus.LoadTreeNum = 0;
            NodeStatus.LoadTreeHash = [];
            NodeStatus.LoadHead = undefined;
            return 0;
        }
    };
    
    Engine.DoEventDB = function (Store)
    {
        Engine.ToDebug("Engine.DoEventDB");
        
        //iterating through the array of statuses-looking for events
        
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            var BlockSeed = NodeStatus.BlockSeed;
            if(!BlockSeed || NodeStatus.LoadNum || NodeStatus.LoadTreeNum)
                continue;
            
            //iterate over the loaded blocks starting with the block recorded in the status table, looking for the first one in the chain
            var BlockHead2 = Engine.CalcHead(BlockSeed);
            var BlockHead = Engine.GetNextPrevBlock(BlockHead2);
            
            if(Engine.DoNextBodyLoad(BlockHead, NodeStatus))
                continue;
            
            //checking for database entries
            if(!Engine.CheckCorrectLoad(BlockHead, BlockHead2, NodeStatus))
                continue;
            
            //Calc SumPow
            var BlockDB = Engine.GetBlockHeaderDB(BlockHead2.BlockNum);
            if(!BlockDB)
                continue;
            var SumPow = BlockDB.SumPow + BlockSeed.HeadDeltaSum;
            var BlockSeedDB = Engine.GetBlockHeaderDB(BlockSeed.BlockNum);
            if(BlockSeedDB)
            {
                if(IsEqArr(BlockSeedDB.Hash, NodeStatus.Hash))
                {
                    //so there is a record of this chain in the database and since it is more priority, we stop the cycle
                    break;
                }
                
                //write only if the chain has a large POW amount than the existing one in the database
                if(SumPow < BlockSeedDB.SumPow || (SumPow === BlockSeedDB.SumPow && CompareArr(BlockSeedDB.Hash, BlockSeed.Hash) <= 0))
                {
                    continue;
                }
            }
            
            //writing a chain to the database
            
            var Res = Engine.SaveChainToDB(BlockHead, BlockSeed, SumPow);
            if(Res === 0)
            {
                Engine.ToLog("Error on SaveChainToDB " + BlockHead.BlockNum + "-" + BlockSeed.BlockNum + " POW:" + SumPow);
            }
            
            //since this chain is a higher priority, we stop the cycle
            break;
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
        
        if(Data.DataHash === undefined)
            throw "PrecessDataMaxLider Error DataHash on block:" + BlockNum;
        if(Data.MinerHash === undefined)
            throw "PrecessDataMaxLider Error MinerHash on block:" + BlockNum;
    };
    
    Engine.CalcHashMaxLider = function (Data,BlockNum)
    {
        Data.BlockNum = BlockNum;
        Data.Hash = sha3(Data.DataHash.concat(Data.MinerHash));
        Data.Power = Engine.GetPowPower(Data.Hash);
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
            var NodeStatus2 = {Power:Data.Power, Hash:Data.Hash, DataHash:Data.DataHash, MinerHash:Data.MinerHash, BlockSeed:undefined,
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
