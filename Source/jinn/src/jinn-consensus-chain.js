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
    };
    
    Engine.SetBlockBody = function (BlockDst,BlockSrc)
    {
        BlockDst.TxData = BlockSrc.TxData;
        
        BlockDst.TxPosition = BlockSrc.TxPosition;
        BlockDst.TxCount = BlockSrc.TxCount;
    };
    
    Engine.GetPrevBlock = function (Block)
    {
        return Engine.DB.GetPrevBlockDB(Block);
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
    Engine.GetFirstEmptyBodyBlock0 = function (FirstBlockHeadNum,BlockSeed)
    {
        var Block = BlockSeed;
        while(Block)
        {
            if(Block.BlockNum < FirstBlockHeadNum)
            {
                Block = undefined;
                break;
            }
            
            if(NeedLoadBodyFromNet(Block))
            {
                break;
            }
            
            Block = Engine.GetPrevBlock(Block);
        }
        
        return Block;
    };
    
    Engine.AddJumpToArr = function (BlockSeed,Block,Arr)
    {
        var Delta = BlockSeed.BlockNum - Block.BlockNum;
        if(Delta > 0)
        {
            var Level = Math.floor(Math.log(Delta));
            if(!Arr[Level])
                Arr[Level] = Block;
        }
    };
    Engine.GetStrFromJumpArr = function (ArrJump)
    {
        var Str = " Arr:";
        var Str2 = "";
        var bWas = 0;
        for(var i = 0; i < ArrJump.length; i++)
        {
            var CurBlock = ArrJump[i];
            if(CurBlock)
            {
                if(bWas)
                {
                    Str += "-";
                    Str2 += "-";
                }
                Str += CurBlock.BlockNum;
                Str2 += GetHexFromArr(CurBlock.SumHash).substr(0, 6);
                bWas = 1;
            }
        }
        return Str + " (" + Str2 + ")";
    };
    Engine.CalcHead = function (BlockSeed)
    {
        
        var Count = 0;
        var BlockSeed0 = BlockSeed;
        var Block = BlockSeed;
        
        var ArrJump = [];
        var BlockSet;
        var BlockJump = undefined;
        while(true)
        {
            Count++;
            if(Engine.IsValidBlockDB(Block))
            {
                break;
            }
            var BlockHead = Engine.GetBlockJump(Block, "H");
            if(BlockHead)
            {
                Engine.AddJumpToArr(BlockSeed0, BlockHead, ArrJump);
                
                if(BlockHead.BlockNum < 100000)
                    var Sop = 1;
                
                BlockJump = BlockHead;
                Block = BlockHead;
                
                continue;
            }
            
            var PrevBlock = Engine.GetPrevBlock(Block, 1);
            if(!PrevBlock)
                break;
            
            if(!IsEqArr(Block.PrevSumHash, PrevBlock.SumHash))
                ToLogTrace("Error PrevSumHash on Block=" + Block.BlockNum);
            
            Engine.AddJumpToArr(BlockSeed0, Block, ArrJump);
            BlockSet = Block;
            Block = PrevBlock;
        }
        if(TEST_BLOCK_LIST)
        {
            var Block0 = Engine.GetFirstBlockHead0(BlockSeed);
            if(Block && Block0 && Block0 !== Block && !IsEqArr(Block0.SumHash, Block.SumHash))
            {
                
                var Str = "Err from seed:" + BlockInfo(BlockSeed) + " BlockHead = " + BlockInfo(Block) + "  Need = " + BlockInfo(Block0);
                Engine.ToLog(Str);
            }
        }
        
        var Delta = BlockSeed0.BlockNum - Block.BlockNum;
        if(Delta > 0)
        {
            if(!ArrJump.length || ArrJump[ArrJump.length - 1] !== Block)
                ArrJump.push(Block);
            
            var nSet = 0;
            var StrSet = "";
            var PrevBlock = BlockSeed0;
            for(var i = 0; i < ArrJump.length; i++)
            {
                var CurBlock = ArrJump[i];
                if(CurBlock)
                {
                    if(Engine.SetBlockJump(PrevBlock, CurBlock, "H"))
                    {
                        if(StrSet)
                            StrSet += ",";
                        StrSet += "" + PrevBlock.BlockNum + "->" + CurBlock.BlockNum;
                        nSet++;
                    }
                    PrevBlock = CurBlock;
                }
            }
            if(Count > 50)
                Engine.ToLog("[" + Count + "/" + nSet + "]" + "  jump: " + Delta + "   " + BlockSeed0.BlockNum + "->" + Block.BlockNum + "   " + GetHexFromArr(BlockSeed0.SumHash).substr(0,
                8) + "->" + GetHexFromArr(Block.SumHash).substr(0, 8) + Engine.GetStrFromJumpArr(ArrJump) + "  " + StrSet);
        }
        
        JINN_STAT.FindHeadCount += Count;
        JINN_STAT.MAXFindHeadCount = Math.max(JINN_STAT.MAXFindHeadCount, Count);
        
        return Block;
    };
    
    Engine.CalcHead00 = function (BlockSeed,bTest)
    {
        
        var Count = 0;
        var Block = BlockSeed;
        var JumpBlockTo, JumpBlock;
        
        var BlockSet;
        
        while(true)
        {
            Count++;
            if(Engine.IsValidBlockDB(Block))
            {
                break;
            }
            var BlockHead = Engine.GetBlockJump(Block, "H");
            if(BlockHead)
            {
                if(!Engine.IsValidBlockDB(BlockHead))
                {
                    JumpBlock = Block;
                    JumpBlockTo = BlockHead;
                    Block = BlockHead;
                    
                    continue;
                }
            }
            
            var PrevBlock = Engine.GetPrevBlock(Block, 1);
            if(!PrevBlock)
                break;
            
            if(!IsEqArr(Block.PrevSumHash, PrevBlock.SumHash))
                ToLogTrace("Error PrevSumHash on Block=" + Block.BlockNum);
            
            JumpBlock = undefined;
            JumpBlockTo = undefined;
            
            BlockSet = Block;
            
            Block = PrevBlock;
        }
        if(TEST_BLOCK_LIST)
        {
            var Block0 = Engine.GetFirstBlockHead0(BlockSeed);
            if(Block && Block0 && Block0 !== Block && !IsEqArr(Block0.SumHash, Block.SumHash))
            {
                
                var Str = "Err from seed:" + BlockInfo(BlockSeed) + " BlockHead = " + BlockInfo(Block) + "  Need = " + BlockInfo(Block0);
                if(JumpBlock)
                {
                    Str += "  JumpBlock = " + BlockInfo(JumpBlock) + " -> " + BlockInfo(JumpBlockTo);
                }
                Engine.ToLog(Str);
            }
        }
        
        if(BlockSeed && BlockSet && BlockSeed.BlockNum !== BlockSet.BlockNum)
        {
            
            var Delta = BlockSeed.BlockNum - BlockSet.BlockNum;
            
            var bWas = Engine.SetBlockJump(BlockSeed, BlockSet, "H");
        }
        
        JINN_STAT.FindHeadCount += Count;
        JINN_STAT.MAXFindHeadCount = Math.max(JINN_STAT.MAXFindHeadCount, Count);
        
        return Block;
    };
    
    Engine.GetFirstEmptyBodyBlock = function (FirstBlockHeadNum,BlockSeed)
    {
        var Count = 0;
        var Block = BlockSeed;
        var BlockSet, JumpBlock, JumpBlockTo;
        while(Block)
        {
            BlockSet = Block;
            Count++;
            if(Block.BlockNum < FirstBlockHeadNum)
            {
                Block = undefined;
                break;
            }
            
            if(NeedLoadBodyFromNet(Block))
            {
                break;
            }
            var FirstBlock = Engine.GetBlockJump(Block, "B");
            if(FirstBlock)
            {
                JumpBlock = Block;
                JumpBlockTo = FirstBlock;
                
                Block = FirstBlock;
                BlockSet = JumpBlockTo;
                continue;
            }
            
            Block = Engine.GetPrevBlock(Block);
        }
        JINN_STAT.FindEmptyCount += Count;
        JINN_STAT.MAXFindEmptyCount = Math.max(JINN_STAT.MAXFindEmptyCount, Count);
        if(TEST_BLOCK_LIST)
        {
            var Block0 = Engine.GetFirstEmptyBodyBlock0(FirstBlockHeadNum, BlockSeed);
            if(Block && Block0 && Block0 !== Block && !IsEqArr(Block0.SumHash, Block.SumHash))
            {
                var Str = "Err EmptyBody = " + BlockInfo(Block) + "  Need = " + BlockInfo(Block0) + "  FirstBlockHead=" + FirstBlockHead.BlockNum;
                if(JumpBlock)
                    Str += "  JumpBlock = " + BlockInfo(JumpBlock) + " -> " + BlockInfo(JumpBlockTo);
                Engine.ToLog(Str);
            }
        }
        
        if(BlockSeed && BlockSet && BlockSeed.BlockNum !== BlockSet.BlockNum)
        {
            Engine.SetBlockJump(BlockSeed, BlockSet, "B");
        }
        
        return Block;
    };
    
    Engine.SetBlockJump = function (BlockSeed,Block,StrType)
    {
        return Engine.DB.SetBlockJump(BlockSeed, Block, StrType);
    };
    Engine.GetBlockJump = function (BlockSeed,StrType)
    {
        return Engine.DB.GetBlockJump(BlockSeed, StrType);
    };
    
    Engine.IsValidBlockDB = function (Block)
    {
        
        if(Block.BlockNum > Engine.GetMaxNumBlockDB())
            return 0;
        
        if(Block.BlockNum > 0 && IsZeroArr(Block.SumHash))
        {
            ToLogTrace("IsValidBlockDB: IsZeroArr(Block.SumHash) on Block.BlockNum=" + Block.BlockNum);
            return 0;
        }
        
        var BlockDB = Engine.GetBlockHeaderDB(Block.BlockNum);
        if(BlockDB)
        {
            if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT && IsEqArr(BlockDB.Hash, Block.Hash))
                return 1;
            
            if(IsEqArr(BlockDB.SumHash, Block.SumHash))
                return 1;
        }
        return 0;
    };
    
    Engine.GetMaxPowerBlockFromChain = function (BlockNum)
    {
        
        var ArrBlock = Engine.DB.GetChainArrByNum(BlockNum, 0);
        if(ArrBlock.length === 0)
            ToLogTrace("Error ArrBlock.length===0 on Block=" + BlockNum);
        
        var LinkSumHash = Engine.GetLinkDataFromDBNum(BlockNum);
        var PrevSumHash = Engine.GetPrevSumHashFromDBNum(BlockNum);
        
        var MaxBlock = undefined;
        for(var mode = 1; mode <= 2; mode++)
            for(var n = 0; n < ArrBlock.length; n++)
            {
                var CurBlock = ArrBlock[n];
                if(IsEqArr(LinkSumHash, CurBlock.LinkSumHash) && !NeedLoadBodyFromNet(CurBlock))
                {
                    if(mode === 1 && IsEqArr(CurBlock.PrevSumHash, PrevSumHash))
                    {
                        if(!MaxBlock || (MaxBlock.Power < CurBlock.Power || (MaxBlock.Power === CurBlock.Power && CompareArr(CurBlock.Hash, MaxBlock.Hash) < 0)))
                            MaxBlock = CurBlock;
                    }
                    else
                        if(mode === 2)
                        {
                            if(!MaxBlock || (MaxBlock.Power < CurBlock.Power || (MaxBlock.Power === CurBlock.Power && CompareArr(CurBlock.Hash, MaxBlock.Hash) < 0)))
                                MaxBlock = CurBlock;
                        }
                }
            }
        return MaxBlock;
    };
    Engine.InitBlockList();
}

function BlockInfo(Block)
{
    var Str;
    if(!Block)
        Str = "-";
    else
    {
        Str = "" + Block.BlockNum + "(" + GetHexFromArr(Block.Hash).substr(0, 4) + ")";
    }
    return Str;
}
global.BlockInfo = BlockInfo;
