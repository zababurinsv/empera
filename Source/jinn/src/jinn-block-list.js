/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass});

global.TEST_BLOCK_LIST = 0;

//Engine context

function InitClass(Engine)
{
    
    Engine.InitBlockList = function ()
    {
        Engine.EmptyBodyLink = 1;
    };
    
    Engine.AddChainArr = function (Block)
    {
        if(!Block.LinkHash)
        {
            ToLogTrace("!Block.LinkHash on Block=" + Block.BlockNum);
            return ;
        }
        if(!Block.MinerHash)
            ToLogTrace("!Block.MinerHash on Block=" + Block.BlockNum);
        if(!Block.DataHash)
            ToLogTrace("!Block.DataHash on Block=" + Block.BlockNum);
        
        var ArrBlock = Engine.GetChainArrByNum(Block.BlockNum);
        ArrBlock.push(Block);
        Engine.SetChainListForSave(Block.BlockNum);
    };
    
    Engine.SetBlockData = function (BlockDst,BlockSrc)
    {
        BlockDst.TxData = BlockSrc.TxData;
        Engine.SetChainListForSave(BlockDst.BlockNum);
    };
    
    Engine.GetPrevBlock = function (Block,bReadOnly)
    {
        return Engine.GetBlockAtNum(Block.BlockNum - 1, Block.PrevBlockHash, bReadOnly);
    };
    Engine.GetPrevBlockFromDB = function (Block)
    {
        var BlockNum = Block.BlockNum - 1;
        ArrBlock;
        var ArrBlock = Engine.GetChainArrByNum(BlockNum);
        var Block = Engine.GetBlockHeaderDB(BlockNum);
        if(Block)
            ArrBlock.push(Block);
        return Block;
    };
    
    Engine.GetBlockAtNum = function (BlockNum,Hash,bReadOnly)
    {
        var ArrBlock = Engine.GetChainArrByNum(BlockNum, bReadOnly);
        for(var i = 0; i < ArrBlock.length; i++)
        {
            var Block2 = ArrBlock[i];
            if(IsEqArr(Hash, Block2.Hash))
            {
                return Block2;
            }
        }
        
        return undefined;
    };
    Engine.GetFirstBlockHead0 = function (BlockSeed)
    {
        var Block = BlockSeed;
        while(Block)
        {
            if(Engine.IsValidBlockDB(Block))
                break;
            
            var PrevBlock = Engine.GetPrevBlock(Block);
            if(!PrevBlock)
                break;
            
            Block = PrevBlock;
        }
        return Block;
    };
    Engine.GetFirstEmptyBodyBlock = function (FirstBlockHead,BlockSeed)
    {
        
        var Count = 0;
        var Block = BlockSeed;
        var BlockSet, JumpBlock, JumpBlockTo;
        while(Block)
        {
            BlockSet = Block;
            Count++;
            if(Block.BlockNum < FirstBlockHead.BlockNum)
            {
                if(!FirstBlockHead.TxData)
                {
                    Block = FirstBlockHead;
                }
                else
                {
                    Block = undefined;
                }
                break;
            }
            
            if(!IsZeroArr(Block.TreeHash))
            {
                
                if(!Block.TxData)
                {
                    var ArrBlock = Engine.GetBlockArrFromNum(Block.BlockNum, 1);
                    if(ArrBlock)
                    {
                        for(var i = 0; i < ArrBlock.length; i++)
                        {
                            var Block2 = ArrBlock[i];
                            if(Block2 && Block2.TxData && IsEqArr(Block2.TreeHash, Block.TreeHash))
                            {
                                Engine.SetBlockData(Block, Block2);
                            }
                        }
                    }
                }
                
                if(!Block.TxData)
                {
                    break;
                }
            }
            if(Block.FirstEmptyBodyNum && Block.BodyLinkVer)
            {
                var FirstBlock = Engine.GetBlockAtNum(Block.FirstEmptyBodyNum, Block.FirstEmptyBodyHash);
                if(FirstBlock && FirstBlock.BodyLinkVer === Block.BodyLinkVer)
                {
                    JumpBlock = Block;
                    JumpBlockTo = FirstBlock;
                    Block.Description = " jump to " + Block.FirstEmptyBodyNum + ":" + Block.BodyLinkVer;
                    Block = FirstBlock;
                    BlockSet = JumpBlockTo;
                    
                    continue;
                }
            }
            
            Block = Engine.GetPrevBlock(Block);
        }
        JINN_STAT.MAXFindEmptyCount = Math.max(JINN_STAT.MAXFindEmptyCount, Count);
        if(TEST_BLOCK_LIST)
        {
            var Block0 = Engine.GetFirstEmptyBodyBlock0(FirstBlockHead, BlockSeed);
            if(Block0 !== Block)
            {
                var Str = "Err EmptyBody = " + BlockInfoB(Block) + "  Need = " + BlockInfoB(Block0) + "  FirstBlockHead=" + FirstBlockHead.BlockNum + "   ChainDBBlockMin=" + Engine.ChainDBBlockMin;
                if(JumpBlock)
                    Str += "  JumpBlock = " + BlockInfoB(JumpBlock) + " -> " + BlockInfoB(JumpBlockTo);
                Engine.ToLog(Str);
            }
        }
        
        if(BlockSet && BlockSet !== BlockSeed)
        {
            BlockSeed.FirstEmptyBodyNum = BlockSet.BlockNum;
            BlockSeed.FirstEmptyBodyHash = BlockSet.Hash;
            if(BlockSet !== JumpBlockTo)
            {
                Engine.EmptyBodyLink++;
                BlockSet.BodyLinkVer = Engine.EmptyBodyLink;
                Engine.SetChainListForSave(BlockSet.BlockNum);
            }
            BlockSeed.BodyLinkVer = BlockSet.BodyLinkVer;
            
            Engine.SetChainListForSave(BlockSeed.BlockNum);
        }
        
        return Block;
    };
    
    Engine.GetFirstEmptyBodyBlock0 = function (FirstBlockHead,BlockSeed)
    {
        var Block = BlockSeed;
        while(Block)
        {
            if(Block.BlockNum < FirstBlockHead.BlockNum)
            {
                if(!FirstBlockHead.TxData)
                {
                    Block = FirstBlockHead;
                }
                else
                {
                    Block = undefined;
                }
                break;
            }
            
            if(!IsZeroArr(Block.TreeHash))
            {
                
                if(!Block.TxData)
                {
                    var ArrBlock = Engine.GetBlockArrFromNum(Block.BlockNum, 1);
                    if(ArrBlock)
                    {
                        for(var i = 0; i < ArrBlock.length; i++)
                        {
                            var Block2 = ArrBlock[i];
                            if(Block2 && Block2.TxData && IsEqArr(Block2.TreeHash, Block.TreeHash))
                            {
                                Engine.SetBlockData(Block, Block2);
                            }
                        }
                    }
                }
                
                if(!Block.TxData)
                {
                    break;
                }
            }
            
            Block = Engine.GetPrevBlock(Block);
        }
        
        return Block;
    };
    
    Engine.CheckCorrectLoad = function (BlockHead,BlockHead2,NodeStatus)
    {
        
        var Count = JINN_CONST.LINK_HASH_LENGTH;
        var Delta = BlockHead2.BlockNum - BlockHead.BlockNum;
        if(Delta < Count - 1)
        {
            return 0;
        }
        var Block = BlockHead2;
        while(Block)
        {
            if(!Engine.IsValidBlockDB(Block))
                return 0;
            
            Count--;
            if(Count <= 0)
                break;
            
            Block = Engine.GetPrevBlock(Block);
        }
        global.BlockLastInfo = " Info:BlockHead.BlockNum=" + BlockHead.BlockNum + " Delta=" + Delta;
        
        return 1;
    };
    
    Engine.GetNextPrevBlock = function (Block)
    {
        
        var Count;
        Count = JINN_CONST.LINK_HASH_LENGTH;
        while(Block)
        {
            if(!Engine.IsValidBlockDB(Block))
                break;
            
            Count--;
            if(Count <= 0)
                break;
            
            var PrevBlock = Engine.GetPrevBlock(Block, 1);
            if(!PrevBlock)
            {
                PrevBlock = Engine.GetPrevBlockFromDB(Block);
                if(!PrevBlock)
                    break;
            }
            
            Block = PrevBlock;
        }
        return Block;
    };
    
    //Delta SumPOW
    Engine.CalcHead = function (BlockSeed)
    {
        
        var Count = 0;
        var TotalDeltaSum = 0;
        var Block = BlockSeed;
        var JumpBlockTo, JumpBlock;
        while(true)
        {
            Count++;
            if(Engine.IsValidBlockDB(Block))
            {
                break;
            }
            
            if(Block.HeadNum)
            {
                var BlockHead = Engine.GetBlockJump(Block);
                if(BlockHead)
                {
                    if(!Engine.IsValidBlockDB(BlockHead))
                    {
                        JumpBlock = Block;
                        JumpBlockTo = BlockHead;
                        
                        TotalDeltaSum += Block.HeadDeltaSum;
                        Block = BlockHead;
                        continue;
                    }
                }
                else
                    if(TEST_BLOCK_LIST)
                    {
                        Engine.ToLog("!BlockHead = " + Block.HeadNum + " from block = " + BlockInfo(Block));
                        Block.HeadNum = 0;
                        Block.HeadHash = ZERO_ARR_32;
                        Block.HeadDeltaSum = 0;
                        Engine.SetChainListForSave(Block.BlockNum);
                    }
            }
            
            var PrevBlock = Engine.GetPrevBlock(Block, 1);
            if(!PrevBlock)
                break;
            
            JumpBlock = undefined;
            JumpBlockTo = undefined;
            TotalDeltaSum += Block.Power;
            Block = PrevBlock;
        }
        if(TEST_BLOCK_LIST)
        {
            var Block0 = Engine.GetFirstBlockHead0(BlockSeed);
            if(Block0 !== Block)
            {
                
                var Str = "Err from seed:" + BlockInfo(BlockSeed) + " BlockHead = " + BlockInfo(Block) + "  Need = " + BlockInfo(Block0);
                if(JumpBlock)
                {
                    Str += "  JumpBlock = " + BlockInfo(JumpBlock) + " -> " + BlockInfo(JumpBlockTo);
                }
                Engine.ToLog(Str);
            }
        }
        
        if(BlockSeed !== Block)
        {
            Engine.SetBlockJump(BlockSeed, Block);
            BlockSeed.HeadDeltaSum = TotalDeltaSum;
            
            Engine.SetChainListForSave(BlockSeed.BlockNum);
        }
        
        JINN_STAT.MAXFindHeadCount = Math.max(JINN_STAT.MAXFindHeadCount, Count);
        
        return Block;
    };
    
    Engine.SetBlockJump = function (BlockSeed,Block)
    {
        var ArrBlock = Engine.GetChainArrByNum(Block.BlockNum, 1);
        for(var i = 0; i < ArrBlock.length; i++)
        {
            var Block2 = ArrBlock[i];
            if(IsEqArr(Block.Hash, Block2.Hash))
            {
                BlockSeed.HeadNum = Block.BlockNum;
                BlockSeed.HeadRow = i;
                return 1;
            }
        }
        
        ToLogTrace("Error SetBlockJump on Block=" + Block.BlockNum);
        return 0;
    };
    Engine.GetBlockJump = function (BlockSeed)
    {
        var ArrBlock = Engine.GetChainArrByNum(BlockSeed.HeadNum, 1);
        var Block = ArrBlock[BlockSeed.HeadRow];
        return Block;
    };
    
    Engine.GetBlockArrayFromChain = function (BlockHead,BlockSeed,MinCount,bCut,bTest)
    {
        var BlockSeed0 = BlockSeed;
        if(!BlockHead)
            return [];
        var MinNum = BlockHead.BlockNum;
        var MaxNum = BlockHead.BlockNum + MinCount - 1;
        
        var StartBlock;
        while(1)
        {
            if(BlockSeed.BlockNum === MaxNum)
            {
                StartBlock = BlockSeed;
                break;
            }
            var PrevBlock = Engine.GetPrevBlock(BlockSeed, 1);
            if(!PrevBlock)
            {
                return [];
            }
            var BlockHead2 = Engine.GetBlockJump(PrevBlock);
            
            if(BlockHead2 && BlockHead2.BlockNum >= MaxNum)
            {
                StartBlock = BlockHead2;
                break;
            }
            BlockSeed = PrevBlock;
        }
        var Arr = [];
        var Block = StartBlock;
        while(1)
        {
            Arr[Block.BlockNum - MinNum] = Block;
            if(PrevBlock === BlockHead)
                break;
            var PrevBlock = Engine.GetPrevBlock(Block, 1);
            if(!PrevBlock)
            {
                break;
            }
            Block = PrevBlock;
        }
        
        if(bCut && Arr.length > MinCount)
        {
            Arr.length = MinCount;
        }
        
        if(bTest)
            return [];
        for(var i = 0; i < Arr.length; i++)
        {
            if(!Arr[i])
            {
                
                ToLogTrace("!Arr[i] need : " + (MinNum + i));
            }
            else
                if(Arr[i].BlockNum !== MinNum + i)
                    ToLogTrace("Error Arr[i].BlockNum = " + Arr[i].BlockNum + "/" + (MinNum + i));
        }
        
        return Arr;
    };
    
    Engine.IsValidBlockDB = function (Block)
    {
        if(IsZeroArr(Block.Hash))
            ToLogTrace("IsValidBlockDB: IsZeroArr(Block.Hash) on Block.BlockNum=" + Block.BlockNum);
        
        var BlockDB = Engine.GetBlockHeaderDB(Block.BlockNum);
        if(BlockDB && IsEqArr(BlockDB.Hash, Block.Hash))
        {
            return 1;
        }
        return 0;
    };
    
    Engine.SaveChainToDB = function (BlockHead,BlockSeed,SumPow)
    {
        var Arr = [];
        var CurBlock = BlockSeed;
        
        if(BlockHead.BlockNum >= JINN_CONST.BLOCK_GENESIS_COUNT && BlockHead.BlockNum + 1 < Engine.ChainDBBlockMin)
        {
            Engine.ToLog("#1 NO Engine.SaveChainToDB " + BlockHead.BlockNum + "/" + Engine.ChainDBBlockMin, 3);
            return  - 1;
        }
        
        while(CurBlock)
        {
            if(CurBlock.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
                break;
            if(IsEqArr(CurBlock.Hash, BlockHead.Hash))
                break;
            Arr.unshift(CurBlock);
            CurBlock = Engine.GetPrevBlock(CurBlock);
        }
        
        for(var b = 0; b < Arr.length; b++)
        {
            var Block = Arr[b];
            var BlockArr = Engine.GetChainArrByNum(Block.BlockNum);
            delete Block.BodyLinkVer;
            delete Block.FirstEmptyBodyNum;
            delete Block.FirstEmptyBodyHash;
            var Res = Engine.SaveToDB(Block, 0);
            if(!Res || Block.SumPow === undefined)
            {
                var Arr2 = [];
                for(var n = 0; n < Arr.length; n++)
                    Arr2.push(Arr[n].BlockNum);
                ToLog("#3 Res=" + Res + "  Error on Block: " + Block.BlockNum + "\n Arr: " + Arr2 + " " + global.BlockLastInfo);
                return 0;
            }
            
            Engine.SetBlockAsSave(Block);
        }
        
        if(Block && TEST_BLOCK_LIST)
        {
            if(Block.SumPow !== SumPow)
            {
                ToLogTrace("#4 Error SumPow = " + Block.SumPow + "/" + SumPow + " on Block: " + Block.BlockNum + "  SaveChainToDB:" + BlockHead.BlockNum + "-" + BlockSeed.BlockNum);
            }
        }
        
        return 1;
    };
    function BlockInfo(Block)
    {
        var Str;
        if(!Block)
            Str = "-";
        else
        {
            Str = "" + Block.BlockNum;
        }
        return Str;
    };
    function BlockInfoB(Block)
    {
        if(!Block)
            return "-";
        return "" + Block.BlockNum + " (" + Block.BodyLinkVer + ")";
    };
    Engine.InitBlockList();
}
