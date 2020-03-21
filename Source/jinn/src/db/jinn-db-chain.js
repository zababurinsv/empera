/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

"use strict";

global.TEST_DB_BLOCK = 1;

var BWRITE_MODE = (global.PROCESS_NAME === "MAIN");

const JINN_VERSION_DB = 3;
const NUM_FOR_MAX_BLOCK =  - 1;

const HEADER_FORMAT = {VersionDB:"byte", BlockNum:"uint", PrevPosition:"uint", TreeHash:"hash", MinerHash:"hash", PrevSumPow:"uint",
    PrevSumHash:"hash", TxCount:"uint16", TxPosition:"uint", HeadPosH:"uint", HeadPosB:"uint", };

const BODY_FORMAT = {PrevPosition:"uint", PrevCountTx:"uint16", TxArr:[{body:"tr"}], TxIndex:["uint16"]};

class CDBChain
{
    constructor(EngineID, FCalcBlockHash)
    {
        this.EngineID = EngineID
        this.CalcBlockHash = FCalcBlockHash
        
        this.DBMainIndex = new CDBRow("main-index", {MainPosition:"uint"}, !BWRITE_MODE, "BlockNum", 10, EngineID)
        this.DBChainIndex = new CDBRow("chain-index", {LastPosition:"uint"}, !BWRITE_MODE, "BlockNum", 10, EngineID)
        this.DBBlockHeader = new CDBItem("block-data", HEADER_FORMAT, !BWRITE_MODE, EngineID, 1)
        this.DBBlockBody = new CDBItem("block-data", BODY_FORMAT, !BWRITE_MODE, EngineID)
    }
    DoNode()
    {
    }
    Close()
    {
        this.DBMainIndex.Close()
        this.DBChainIndex.Close()
        this.DBBlockHeader.Close()
        this.DBBlockBody.Close()
    }
    WriteBlock(Block)
    {
        var Item = this.ReadIndex(Block.BlockNum);
        if(!Item)
        {
            Item = {BlockNum:Block.BlockNum, LastPosition:0}
        }
        if(TEST_DB_BLOCK && !Block.Position)
        {
            var Find2 = this.GetBlockFromDB(Block.BlockNum, Block.SumHash);
            if(Find2)
                ToLogTrace("Find2: on Block=" + Block.BlockNum)
        }
        
        var bSet = 0;
        if(!Block.Position)
        {
            if(Block.Position === 0)
                ToLogTrace("Block.Position===0 on Block=" + Block.BlockNum)
            if(isNaN(Item.LastPosition))
                ToLogTrace("Is NAN LastPosition on Block=" + Block.BlockNum)
            
            Block.PrevPosition = Item.LastPosition
            bSet = 1
        }
        
        if(!IsZeroArr(Block.TreeHash) && Block.TxData && !Block.TxPosition)
        {
            Block.TxPosition = this.GetBodyFilePosition(Item.LastPosition, Block.BlockNum, Block.TreeHash, Block.TxData)
            Block.TxCount = Block.TxData.length
            if(!Block.TxPosition)
            {
                ToLogTrace("Error write tx on Block=" + Block.BlockNum + "  TxPosition=" + Block.TxPosition)
            }
        }
        
        JINN_STAT.SaveBlock++
        
        Block.VersionDB = JINN_VERSION_DB
        
        if(!this.DBBlockHeader.Write(Block))
            return 0;
        
        if(bSet)
        {
            Item.LastPosition = Block.Position
            return this.WriteIndex(Item);
        }
        return 1;
    }
    
    ReadBlock(Position, bRaw)
    {
        JINN_STAT.LoadHeader++
        
        var Block = this.DBBlockHeader.Read(Position);
        if(!Block)
            return undefined;
        if(Block.VersionDB !== JINN_VERSION_DB)
        {
            ToLogTrace("Error version DB: " + Block.VersionDB + "/" + JINN_VERSION_DB)
            return undefined;
        }
        
        this.CalcBlockHash(Block)
        
        return Block;
    }
    
    WriteBlockMain(Block)
    {
        Block.BlockNum = Math.floor(Block.BlockNum)
        
        if(!Block.TxPosition && !Block.TxData && !IsZeroArr(Block.TreeHash))
        {
            
            ToLogTrace("Error - empty TxData on Block=" + Block.BlockNum)
            return 0;
        }
        
        if(!this.WriteBlock(Block))
            return 0;
        
        if(!IsZeroArr(Block.TreeHash) && !Block.TxPosition)
        {
            ToLogTrace("WriteBlockMain Zero TxPosition on Block=" + Block.BlockNum + "  TxPosition=" + Block.TxPosition + "  TxCount" + Block.TxCount)
            return 0;
        }
        
        if(!this.WriteMainIndex(Block.BlockNum, Block.Position))
            return 0;
        
        this.TruncateDB(Block.BlockNum)
        
        return 1;
    }
    
    ReadBlockMain(BlockNum)
    {
        var Item = this.ReadMainIndex(BlockNum);
        if(!Item)
            return undefined;
        else
        {
            var Block = this.ReadBlock(Item.MainPosition);
            return Block;
        }
    }
    GetMaxIndex()
    {
        return this.DBChainIndex.GetMaxNum();
    }
    
    ReadIndex(BlockNum)
    {
        return this.DBChainIndex.Read(BlockNum);
    }
    
    WriteIndex(Item)
    {
        return this.DBChainIndex.Write(Item);
    }
    
    GetMaxMainIndex()
    {
        return this.DBMainIndex.GetMaxNum();
    }
    ReadMainIndex(BlockNum)
    {
        return this.DBMainIndex.Read(BlockNum);
    }
    
    WriteMainIndex(BlockNum, Position)
    {
        return this.DBMainIndex.Write({BlockNum:BlockNum, MainPosition:Position});
    }
    
    TruncateDB(LastBlockNum)
    {
        this.DBMainIndex.Truncate(LastBlockNum)
        this.WriteMainIndex(NUM_FOR_MAX_BLOCK, LastBlockNum)
    }
    
    GetMaxNumBlockDB()
    {
        var Num = this.DBMainIndex.GetMaxNum();
        if(Num < 0)
            return  - 1;
        if(BWRITE_MODE)
            return Num;
        
        var Item = this.DBMainIndex.Read(NUM_FOR_MAX_BLOCK);
        if(!Item)
        {
            ToLogTrace("GetMaxNumBlockDB - no Item")
            return  - 1;
        }
        
        return Item.MainPosition;
    }
    
    Clear()
    {
        this.DBChainIndex.Truncate( - 1)
        this.DBMainIndex.Truncate( - 1)
        
        this.DBBlockBody.Truncate(0)
    }
    LoadBlockTx(Block)
    {
        if(IsZeroArr(Block.TreeHash))
            return 1;
        if(Block.TxData)
            return 1;
        if(!Block.TxPosition)
        {
            Block.TxData = undefined
            ToLogTrace("Error TxPosition on Block=" + Block.BlockNum + "  TxPosition=" + Block.TxPosition + "  TxCount" + Block.TxCount)
            return 1;
        }
        
        JINN_STAT.LoadBody++
        var Data = this.DBBlockBody.Read(Block.TxPosition);
        if(!Data)
            return 0;
        
        Block.TxData = Data.TxArr
        
        return 1;
    }
    GetBodyFilePosition(LastPosition, BlockNum, TreeHash, TxData)
    {
        var Position = LastPosition;
        while(Position)
        {
            var Block = this.ReadBlock(Position);
            if(!Block)
            {
                ToLogTrace("Error read block on Pos = " + Position + " on Block=" + BlockNum)
                Position = 0
                break;
            }
            
            if(Block.TxPosition && IsEqArr(TreeHash, Block.TreeHash))
            {
                return Block.TxPosition;
            }
            
            Position = Block.PrevPosition
        }
        
        if(!TxData)
            return 0;
        
        JINN_STAT.SaveBody++
        var Data = {TxArr:TxData};
        this.DBBlockBody.Write(Data)
        return Data.Position;
    }
    SetTxData(BlockNum, TreeHash, TxData)
    {
        if(IsZeroArr(TreeHash))
            return 0;
        var Item = this.ReadIndex(BlockNum);
        if(!Item)
            return 0;
        
        var TxPosition = this.GetBodyFilePosition(Item.LastPosition, BlockNum, TreeHash, TxData);
        if(!TxPosition)
            return 0;
        var Count = 0;
        var Position = Item.LastPosition;
        while(Position)
        {
            var Block = this.ReadBlock(Position);
            if(!Block)
            {
                ToLogTrace("Error read block on Pos = " + Position + " on Block=" + BlockNum)
                Position = 0
                break;
            }
            
            if(!Block.TxPosition && IsEqArr(TreeHash, Block.TreeHash))
            {
                Block.TxPosition = TxPosition
                Block.TxCount = TxData.length
                this.WriteBlock(Block)
                Count++
            }
            
            Position = Block.PrevPosition
        }
        
        return Count;
    }
    GetLastPosition(BlockNum)
    {
        if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            var Item = this.ReadMainIndex(BlockNum);
            if(Item)
                return Item.MainPosition;
        }
        else
        {
            var Item = this.ReadIndex(BlockNum);
            if(Item)
                return Item.LastPosition;
        }
        return 0;
    }
    
    GetChainArrByNum(BlockNum)
    {
        var Arr = [];
        var Position = this.GetLastPosition(BlockNum);
        while(Position)
        {
            var Block = this.ReadBlock(Position);
            if(!Block)
            {
                ToLogTrace("Error read block on Pos = " + Position + " on Block=" + BlockNum)
                break;
            }
            
            Arr.push(Block)
            Position = Block.PrevPosition
        }
        JINN_STAT.MAXChainHeight = Math.max(JINN_STAT.MAXChainHeight, Arr.length)
        return Arr;
    }
    
    GetBlockFromDB(BlockNum, Hash)
    {
        if(BlockNum > 0 && IsZeroArr(Hash))
        {
            ToLogTrace("ZERO Hash on GetBlockFromDB Block=" + BlockNum)
            return undefined;
        }
        var Count = 0;
        var Position = this.GetLastPosition(BlockNum);
        while(Position)
        {
            var Block = this.ReadBlock(Position);
            if(!Block)
            {
                ToLogTrace("Error read block on Pos = " + Position + " on Block=" + BlockNum)
                break;
            }
            
            Count++
            
            if(IsEqArr(Hash, Block.SumHash))
            {
                return Block;
            }
            if(IsEqArr(Hash, Block.Hash))
            {
                return Block;
            }
            
            Position = Block.PrevPosition
        }
        
        JINN_STAT.MAXChainHeight = Math.max(JINN_STAT.MAXChainHeight, Count)
        
        return undefined;
    }
    
    GetPrevBlockDB(Block)
    {
        if(!Block.BlockNum)
            return undefined;
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
            return this.ReadBlockMain(Block.BlockNum - 1);
        
        if(IsZeroArr(Block.PrevSumHash))
        {
            ToLogTrace("ZERO PrevSumHash on Block=" + Block.BlockNum)
            return undefined;
        }
        var PrevBlock = this.GetBlockFromDB(Block.BlockNum - 1, Block.PrevSumHash);
        return PrevBlock;
    }
    SetBlockJump(BlockSeed, Block, StrType)
    {
        
        if(!Block.BlockNum)
            ToLogTrace("SetBlockJump: Block.BlockNum on BlockNum=" + BlockSeed.BlockNum)
        
        if(IsZeroArr(Block.SumHash))
            ToLogTrace("SetBlockJump: IsZeroArr(Block.SumHash) on BlockNum=" + BlockSeed.BlockNum)
        
        if(!Block.Position)
        {
            ToLogTrace("SetBlockJump: Block.Position on BlockNum=" + BlockSeed.BlockNum)
            return 0;
        }
        
        if(Block.BlockNum >= BlockSeed.BlockNum)
        {
            ToLogTrace("SetBlockJump: BlockNum=" + Block.BlockNum + ">=" + BlockSeed.BlockNum)
            return 0;
        }
        
        if(BlockSeed["HeadPos" + StrType] === Block.Position)
            return 0;
        BlockSeed["HeadPos" + StrType] = Block.Position
        this.WriteBlock(BlockSeed)
        return 1;
    }
    
    GetBlockJump(BlockSeed, StrType)
    {
        var BlockPosJump = BlockSeed["HeadPos" + StrType];
        if(!BlockPosJump)
            return undefined;
        
        var Block = this.ReadBlock(BlockPosJump);
        return Block;
    }
    SaveChainToDB(BlockHead, BlockSeed)
    {
        var DB = this;
        DB.TruncateDB(BlockHead.BlockNum)
        
        var Block = BlockSeed;
        var ArrNum = [], ArrPos = [];
        while(Block)
        {
            if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
                break;
            if(IsEqArr(Block.SumHash, BlockHead.SumHash))
                break;
            
            if(!Block.Position)
            {
                ToLogTrace("Error Block.Position on " + Block.BlockNum)
                return 0;
            }
            if(!Block.Hash)
            {
                ToLogTrace("Error Hash")
                return 0;
            }
            if(Block.Power === undefined)
            {
                ToLogTrace("Error Block.Power")
                return 0;
            }
            ArrNum.push(Block.BlockNum)
            ArrPos.push(Block.Position)
            if(ArrNum.length >= 100000)
            {
                this.WriteArrNumPos(ArrNum, ArrPos)
            }
            
            Block = DB.GetPrevBlockDB(Block)
        }
        
        this.WriteArrNumPos(ArrNum, ArrPos)
        DB.TruncateDB(BlockSeed.BlockNum)
        
        return 1;
    }
    
    WriteArrNumPos(ArrNum, ArrPos)
    {
        for(var i = ArrNum.length - 1; i >= 0; i--)
        {
            if(!this.WriteMainIndex(ArrNum[i], ArrPos[i]))
                return 0;
        }
        
        ArrNum.length = 0
        ArrPos.length = 0
    }
};

global.CDBChain = CDBChain;
